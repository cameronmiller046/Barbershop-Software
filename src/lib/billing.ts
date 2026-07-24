import type Stripe from "stripe";
import type { SubscriptionStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { planLimits, stripePriceId } from "@/lib/plans";
import {
  stripeConfigured, retrieveSubscription, retrieveCheckoutSession,
  mapStripeStatus, isLiveStatus, periodEnd,
  ensureStripeCustomer, createIncompleteSubscription, inspectSubscription, stripePublishableKey,
} from "@/lib/stripe";

// Result of preparing an on-page checkout for a tenant.
export type PayState =
  | { status: "live" } // already active/trialing — nothing to pay
  | { status: "pay"; clientSecret: string; mode: "payment" | "setup"; publishableKey: string }
  | { status: "error" };

/**
 * Ensure a tenant has an incomplete subscription ready to confirm with the
 * Payment Element, returning the client secret. Reuses an existing incomplete
 * subscription when it matches the current plan's price; otherwise creates one.
 */
export async function ensureSubscriptionIntent(tenantId: string): Promise<PayState> {
  try {
    const t = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        id: true, plan: true, name: true, email: true, billingEmail: true,
        stripeCustomerId: true, stripeSubscriptionId: true, subscriptionStatus: true,
      },
    });
    if (!t) return { status: "error" };

    const limits = planLimits(t.plan);
    if (!limits.paid) return { status: "live" };
    if (t.subscriptionStatus === "ACTIVE" || t.subscriptionStatus === "TRIALING") return { status: "live" };
    if (!stripeConfigured()) return { status: "error" };

    const pk = stripePublishableKey();
    const priceId = stripePriceId(t.plan);
    if (!pk || !priceId) return { status: "error" };

    // Reuse an existing incomplete subscription if it matches the current price.
    if (t.stripeSubscriptionId) {
      const info = await inspectSubscription(t.stripeSubscriptionId);
      if (info) {
        if (info.status === "ACTIVE" || info.status === "TRIALING") {
          await prisma.tenant.update({
            where: { id: tenantId },
            data: { subscriptionStatus: info.status, status: "ACTIVE" },
          });
          return { status: "live" };
        }
        if (info.intent && info.priceId === priceId) {
          return { status: "pay", clientSecret: info.intent.clientSecret, mode: info.intent.mode, publishableKey: pk };
        }
      }
    }

    // Create a fresh customer (if needed) + incomplete subscription.
    const customerId = await ensureStripeCustomer({
      existingId: t.stripeCustomerId,
      email: (t.billingEmail || t.email) || "",
      name: t.name,
      tenantId,
    });
    const { subscriptionId, clientSecret, mode } = await createIncompleteSubscription({
      customerId, priceId, trialDays: limits.trialDays, tenantId, plan: t.plan,
    });
    await prisma.tenant.update({
      where: { id: tenantId },
      data: { stripeCustomerId: customerId, stripeSubscriptionId: subscriptionId, stripePriceId: priceId, subscriptionStatus: "PENDING" },
    });
    return { status: "pay", clientSecret, mode, publishableKey: pk };
  } catch (err) {
    console.error("[billing] ensureSubscriptionIntent failed:", err);
    return { status: "error" };
  }
}

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
