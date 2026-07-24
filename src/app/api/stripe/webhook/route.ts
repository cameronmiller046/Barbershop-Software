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
// signature, then sync the matching tenant's billing state. The endpoint always
// returns 200 for accepted events so Stripe doesn't retry-storm; only a bad
// signature returns 400.
export async function POST(req: Request) {
  const raw = await req.text();
  const event = constructWebhookEvent(raw, req.headers.get("stripe-signature"));
  if (!event) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
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
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice & { subscription?: string | null };
        const subId = typeof invoice.subscription === "string" ? invoice.subscription : null;
        if (subId) {
          const tenant = await prisma.tenant.findFirst({ where: { stripeSubscriptionId: subId }, select: { id: true } });
          if (tenant) {
            await prisma.tenant.update({ where: { id: tenant.id }, data: { subscriptionStatus: "PAST_DUE" } });
          }
        }
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
