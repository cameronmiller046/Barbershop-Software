import type Stripe from "stripe";
import type { SubscriptionStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  stripeConfigured, retrieveSubscription, retrieveCheckoutSession,
  mapStripeStatus, isLiveStatus, periodEnd,
} from "@/lib/stripe";

/**
 * Write a Stripe subscription's state onto a tenant, flipping the shop live or
 * suspended. Returns whether the shop just went live (so the caller can send a
 * one-time welcome email). Shared by the webhook and the reconcile helpers.
 */
export async function syncTenantFromSubscription(
  tenantId: string,
  sub: Stripe.Subscription,
): Promise<{ status: SubscriptionStatus; goingLive: boolean } | null> {
  const status = mapStripeStatus(sub.status);
  const live = isLiveStatus(status);
  const priceId = sub.items.data[0]?.price?.id ?? null;

  const current = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { subscriptionStatus: true },
  });
  if (!current) return null;

  const goingLive = live && !isLiveStatus(current.subscriptionStatus);
  const end = periodEnd(sub);

  await prisma.tenant.update({
    where: { id: tenantId },
    data: {
      subscriptionStatus: status,
      stripeSubscriptionId: sub.id,
      stripeCustomerId: typeof sub.customer === "string" ? sub.customer : sub.customer.id,
      ...(priceId ? { stripePriceId: priceId } : {}),
      ...(end ? { currentPeriodEnd: end } : {}),
      ...(sub.trial_end ? { trialEndsAt: new Date(sub.trial_end * 1000) } : {}),
      ...(live ? { status: "ACTIVE" as const } : {}),
      ...(status === "CANCELED" ? { status: "SUSPENDED" as const } : {}),
    },
  });

  return { status, goingLive };
}

/**
 * Best-effort reconcile of a tenant's billing state against Stripe. Used when a
 * buyer returns from checkout before the webhook has landed (or if one was
 * missed). The webhook remains authoritative; this just avoids a "processing…"
 * limbo. Never throws.
 *
 * Pass a Checkout `sessionId` (from the success-page redirect) to resolve the
 * subscription even before we've stored its id; otherwise it uses the tenant's
 * stored subscription id.
 */
export async function reconcileTenantBilling(
  tenantId: string,
  sessionId?: string,
): Promise<SubscriptionStatus | null> {
  try {
    if (!stripeConfigured()) return null;

    const t = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { subscriptionStatus: true, stripeSubscriptionId: true },
    });
    if (!t) return null;

    let sub: Stripe.Subscription | null = null;
    if (sessionId) {
      const session = await retrieveCheckoutSession(sessionId);
      const s = session?.subscription;
      sub = s && typeof s !== "string" ? s : typeof s === "string" ? await retrieveSubscription(s) : null;
    }
    if (!sub && t.stripeSubscriptionId) {
      sub = await retrieveSubscription(t.stripeSubscriptionId);
    }
    if (!sub) return t.subscriptionStatus;

    const res = await syncTenantFromSubscription(tenantId, sub);
    return res?.status ?? t.subscriptionStatus;
  } catch (err) {
    console.error("[billing] reconcile failed:", err);
    return null;
  }
}
