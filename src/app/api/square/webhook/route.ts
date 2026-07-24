import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { sendEmail, emailLayout } from "@/lib/email";
import { appUrl } from "@/lib/utils";
import { verifySquareWebhook, getCustomerEmail, mapSquareStatus } from "@/lib/square";
import type { SubscriptionStatus } from "@prisma/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Square posts subscription lifecycle + payment events here. We verify the
// signature, then sync the matching tenant's billing state. The endpoint always
// returns 200 for accepted events so Square doesn't retry-storm; only a bad
// signature returns 401.
export async function POST(req: Request) {
  const raw = await req.text();
  const signature = req.headers.get("x-square-hmacsha256-signature");

  const valid = await verifySquareWebhook({ rawBody: raw, signatureHeader: signature });
  if (!valid) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let event: SquareWebhookEvent;
  try {
    event = JSON.parse(raw);
  } catch {
    return NextResponse.json({ ok: true }); // nothing we can do with unparseable bodies
  }

  try {
    const sub = event?.data?.object?.subscription;
    switch (event.type) {
      case "subscription.created":
      case "subscription.updated":
        if (sub) await syncSubscription(sub);
        break;
      case "invoice.payment_made":
        // A recurring charge succeeded — make sure the shop is marked active.
        await handleInvoicePaid(event);
        break;
      default:
        break; // ignore other event types
    }
  } catch (err) {
    // Log but still 200 — retries won't fix a data problem and would just spam.
    console.error("[square/webhook] handler error:", err);
  }

  return NextResponse.json({ ok: true });
}

async function syncSubscription(sub: SquareSubscription) {
  const status: SubscriptionStatus = mapSquareStatus(sub.status);

  // Correlate the Square subscription to a tenant: by stored subscription id
  // first, then by the buyer's email (which we pre-populated at checkout).
  let tenant = sub.id
    ? await prisma.tenant.findFirst({ where: { squareSubscriptionId: sub.id }, select: TENANT_SEL })
    : null;

  if (!tenant && sub.customer_id) {
    const email = await getCustomerEmail(sub.customer_id);
    if (email) {
      tenant = await prisma.tenant.findFirst({
        where: { billingEmail: email },
        orderBy: { createdAt: "desc" },
        select: TENANT_SEL,
      });
    }
  }
  if (!tenant) {
    console.warn("[square/webhook] no tenant matched subscription", sub.id);
    return;
  }

  const goingLive = status === "ACTIVE" && tenant.subscriptionStatus !== "ACTIVE";

  await prisma.tenant.update({
    where: { id: tenant.id },
    data: {
      subscriptionStatus: status,
      squareSubscriptionId: sub.id ?? tenant.squareSubscriptionId,
      squareCustomerId: sub.customer_id ?? tenant.squareCustomerId,
      squarePlanVariationId: sub.plan_variation_id ?? tenant.squarePlanVariationId,
      // Active subscription → shop is live. A canceled sub suspends the shop.
      ...(status === "ACTIVE" ? { status: "ACTIVE" as const } : {}),
      ...(status === "CANCELED" ? { status: "SUSPENDED" as const } : {}),
    },
  });

  await audit({
    action: "billing.subscription.sync",
    tenantId: tenant.id,
    target: sub.id ?? null,
    meta: { status, plan: tenant.plan },
  });

  if (goingLive) await sendWelcomeLive(tenant.id);
}

async function handleInvoicePaid(event: SquareWebhookEvent) {
  const invoice = event?.data?.object?.invoice;
  const subId = invoice?.subscription_id;
  if (!subId) return;
  const tenant = await prisma.tenant.findFirst({ where: { squareSubscriptionId: subId }, select: TENANT_SEL });
  if (!tenant) return;
  if (tenant.subscriptionStatus !== "ACTIVE" || tenant.status !== "ACTIVE") {
    await prisma.tenant.update({
      where: { id: tenant.id },
      data: { subscriptionStatus: "ACTIVE", status: "ACTIVE" },
    });
    await sendWelcomeLive(tenant.id);
  }
}

const TENANT_SEL = {
  id: true, name: true, slug: true, plan: true, email: true, billingEmail: true,
  status: true, subscriptionStatus: true, squareSubscriptionId: true, squareCustomerId: true,
  squarePlanVariationId: true,
} as const;

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

// ── Minimal shapes for the webhook payloads we consume (snake_case from Square) ──
type SquareSubscription = {
  id?: string;
  status?: string;
  customer_id?: string;
  plan_variation_id?: string;
};
type SquareWebhookEvent = {
  type?: string;
  data?: {
    object?: {
      subscription?: SquareSubscription;
      invoice?: { subscription_id?: string };
    };
  };
};
