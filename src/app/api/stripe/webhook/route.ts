import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { sendEmail, emailLayout } from "@/lib/email";
import { appUrl } from "@/lib/utils";
import { constructWebhookEvent, retrieveSubscription } from "@/lib/stripe";
import { syncTenantFromSubscription } from "@/lib/billing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Stripe posts subscription lifecycle + payment events here. We verify the
// signature, dedupe on the event id (Stripe retries, and may deliver the same
// event twice), then sync the matching tenant's billing state. The endpoint
// always returns 200 for accepted events so Stripe doesn't retry-storm; only a
// bad signature returns 400.
export async function POST(req: Request) {
  const raw = await req.text();
  const event = constructWebhookEvent(raw, req.headers.get("stripe-signature"));
  if (!event) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  // Idempotency: claim the event id before doing any work. A duplicate delivery
  // hits the primary-key conflict, so side effects run exactly once per event.
  try {
    await prisma.processedWebhookEvent.create({ data: { id: event.id, type: event.type } });
  } catch {
    // Already processed (or a race lost the insert) — acknowledge without redoing work.
    return NextResponse.json({ received: true, duplicate: true });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const tenantId = session.metadata?.tenantId;
        const subId = typeof session.subscription === "string" ? session.subscription : session.subscription?.id;
        if (tenantId && subId) {
          const sub = await retrieveSubscription(subId);
          if (sub) await applySubscription(tenantId, sub, { welcomeOnLive: true });
        }
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const tenantId = await resolveTenantId(sub);
        if (tenantId) await applySubscription(tenantId, sub, { welcomeOnLive: true });
        break;
      }
      case "customer.subscription.trial_will_end": {
        // Fires ~3 days before a trial converts to a paid charge. Nudge the shop
        // to confirm a card is on file so the first charge doesn't fail.
        const sub = event.data.object as Stripe.Subscription;
        const tenantId = await resolveTenantId(sub);
        if (tenantId) await sendTrialEndingSoon(tenantId, sub);
        break;
      }
      case "invoice.paid":
      case "invoice.payment_succeeded": {
        // A successful payment clears any past-due flag. If the subscription is
        // expanded/known, re-sync so status + period end reflect the new cycle.
        const invoice = event.data.object as Stripe.Invoice & { subscription?: string | null };
        const subId = typeof invoice.subscription === "string" ? invoice.subscription : null;
        if (subId) {
          const tenant = await prisma.tenant.findFirst({ where: { stripeSubscriptionId: subId }, select: { id: true } });
          if (tenant) {
            const sub = await retrieveSubscription(subId);
            if (sub) await applySubscription(tenant.id, sub, { welcomeOnLive: false });
            // Payment recovered — stop the dunning grace clock.
            await prisma.tenant.update({ where: { id: tenant.id }, data: { pastDueSince: null } });
          }
        }
        break;
      }
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice & { subscription?: string | null };
        const subId = typeof invoice.subscription === "string" ? invoice.subscription : null;
        if (subId) {
          const tenant = await prisma.tenant.findFirst({ where: { stripeSubscriptionId: subId }, select: { id: true, pastDueSince: true } });
          if (tenant) {
            // Start the grace clock on the first failure; keep the original start on retries.
            await prisma.tenant.update({
              where: { id: tenant.id },
              data: { subscriptionStatus: "PAST_DUE", ...(tenant.pastDueSince ? {} : { pastDueSince: new Date() }) },
            });
            await audit({ action: "billing.payment.failed", tenantId: tenant.id, target: subId });
            await sendPaymentFailed(tenant.id, invoice);
          }
        }
        break;
      }
      case "invoice.upcoming": {
        // ~Renewal reminder to the owner a few days before the next charge.
        const invoice = event.data.object as Stripe.Invoice & { subscription?: string | null };
        const subId = typeof invoice.subscription === "string" ? invoice.subscription : null;
        if (subId) {
          const tenant = await prisma.tenant.findFirst({ where: { stripeSubscriptionId: subId }, select: { id: true } });
          if (tenant) await sendRenewalReminder(tenant.id, invoice);
        }
        break;
      }
      case "customer.subscription.paused": {
        // A paused subscription isn't billing — gate access like past-due.
        const sub = event.data.object as Stripe.Subscription;
        const tenantId = await resolveTenantId(sub);
        if (tenantId) await prisma.tenant.update({ where: { id: tenantId }, data: { subscriptionStatus: "PAST_DUE" } });
        break;
      }
      case "charge.dispute.created": {
        // A customer disputed a charge (chargeback). Alert the platform operator
        // so they can respond within Stripe's evidence window.
        const dispute = event.data.object as Stripe.Dispute;
        await alertDispute(dispute);
        break;
      }
      default:
        break; // ignore other event types
    }
  } catch (err) {
    console.error("[stripe/webhook] handler error:", err);
  }

  return NextResponse.json({ received: true });
}

/** Resolve a tenant id from a subscription: metadata first, then a stored id lookup. */
async function resolveTenantId(sub: Stripe.Subscription): Promise<string | null> {
  if (sub.metadata?.tenantId) return sub.metadata.tenantId;
  const tenant = await prisma.tenant.findFirst({ where: { stripeSubscriptionId: sub.id }, select: { id: true } });
  return tenant?.id ?? null;
}

/** Sync a subscription onto its tenant, sending a one-time welcome when it goes live. */
async function applySubscription(tenantId: string, sub: Stripe.Subscription, opts: { welcomeOnLive: boolean }) {
  const res = await syncTenantFromSubscription(tenantId, sub);
  if (!res) {
    console.warn("[stripe/webhook] no tenant for id", tenantId);
    return;
  }
  await audit({ action: "billing.subscription.sync", tenantId, target: sub.id, meta: { status: res.status } });
  if (res.goingLive && opts.welcomeOnLive) await sendWelcomeLive(tenantId);
}

async function sendWelcomeLive(tenantId: string) {
  const t = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { name: true, slug: true, email: true, billingEmail: true },
  });
  if (!t) return;
  const to = t.billingEmail || t.email;
  if (!to) return;
  const siteUrl = appUrl(`/t/${t.slug}`);
  const portalUrl = appUrl("/portal");
  await sendEmail({
    to,
    subject: `Your subscription is active: ${t.name}`,
    html: emailLayout("You're live on The Chair", `
      <p>Your subscription is active and <b>${t.name}</b> is ready to take bookings.</p>
      <p><b>Your website:</b> <a href="${siteUrl}" style="color:#c9a24b">${siteUrl}</a></p>
      <p><b>Your portal:</b> <a href="${portalUrl}" style="color:#c9a24b">${portalUrl}</a></p>
    `),
  });
}

/** Dunning: a charge failed — ask the shop to update their card before Stripe retries run out. */
async function sendPaymentFailed(tenantId: string, invoice: Stripe.Invoice) {
  const t = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { name: true, email: true, billingEmail: true },
  });
  if (!t) return;
  const to = t.billingEmail || t.email;
  if (!to) return;
  const billingUrl = appUrl("/portal/billing/card");
  const amount = typeof invoice.amount_due === "number"
    ? ` of $${(invoice.amount_due / 100).toFixed(2)}` : "";
  await sendEmail({
    to,
    subject: `Payment failed for ${t.name} — action needed`,
    html: emailLayout("Your payment didn't go through", `
      <p>We couldn't process your latest payment${amount} for <b>${t.name}</b>.</p>
      <p>Stripe will retry automatically, but to avoid any interruption to your
         booking site, please update your card now:</p>
      <p><a href="${billingUrl}" style="display:inline-block;background:#c9a24b;color:#0f0f10;
         padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:bold">Update payment method</a></p>
      <p style="font-size:13px;color:#8a8a8a">If you've already fixed this, you can ignore this message.</p>
    `),
  });
}

/** Friendly heads-up to the owner that their subscription renews soon. */
async function sendRenewalReminder(tenantId: string, invoice: Stripe.Invoice) {
  const t = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { name: true, email: true, billingEmail: true } });
  if (!t) return;
  const to = t.billingEmail || t.email;
  if (!to) return;
  const inv = invoice as { next_payment_attempt?: number | null; period_end?: number; amount_due?: number };
  const ts = inv.next_payment_attempt || inv.period_end;
  const when = ts ? new Date(ts * 1000).toLocaleDateString() : "soon";
  const amount = typeof inv.amount_due === "number" ? `$${(inv.amount_due / 100).toFixed(2)}` : "your plan";
  await sendEmail({
    to,
    subject: `Your ${t.name} subscription renews ${when}`,
    html: emailLayout("Upcoming renewal", `
      <p>Heads up — your subscription for <b>${t.name}</b> renews on <b>${when}</b> for <b>${amount}</b>.</p>
      <p>No action needed; your card on file will be charged automatically.</p>
    `),
  });
}

/** Nudge a trialing shop that their card will be charged soon. */
async function sendTrialEndingSoon(tenantId: string, sub: Stripe.Subscription) {
  const t = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { name: true, email: true, billingEmail: true },
  });
  if (!t) return;
  const to = t.billingEmail || t.email;
  if (!to) return;
  const billingUrl = appUrl("/portal/billing/card");
  const when = sub.trial_end ? new Date(sub.trial_end * 1000).toLocaleDateString() : "soon";
  await sendEmail({
    to,
    subject: `Your free trial ends ${when}`,
    html: emailLayout("Your trial is ending", `
      <p>Your free trial for <b>${t.name}</b> ends on <b>${when}</b>, and your
         subscription will start automatically.</p>
      <p>Make sure your payment method is up to date so there's no interruption:</p>
      <p><a href="${billingUrl}" style="display:inline-block;background:#c9a24b;color:#0f0f10;
         padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:bold">Review payment method</a></p>
    `),
  });
}

/** Alert the platform operator about a chargeback so they can submit evidence in time. */
async function alertDispute(dispute: Stripe.Dispute) {
  const to = process.env.PLATFORM_ADMIN_EMAIL?.trim();
  await audit({
    action: "billing.dispute.created",
    target: dispute.id,
    meta: { amount: dispute.amount, reason: dispute.reason, status: dispute.status },
  });
  if (!to) return;
  const amount = `$${((dispute.amount ?? 0) / 100).toFixed(2)}`;
  const dashUrl = `https://dashboard.stripe.com/disputes/${dispute.id}`;
  await sendEmail({
    to,
    subject: `⚠️ Chargeback opened — ${amount} (${dispute.reason})`,
    html: emailLayout("A payment was disputed", `
      <p>A customer opened a dispute for <b>${amount}</b>.</p>
      <p><b>Reason:</b> ${dispute.reason}<br/><b>Status:</b> ${dispute.status}</p>
      <p>Respond before the evidence deadline in Stripe:</p>
      <p><a href="${dashUrl}" style="color:#c9a24b">${dashUrl}</a></p>
    `),
  });
}
