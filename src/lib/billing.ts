import type { SubscriptionStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { findSubscriptionForEmail, squareConfigured } from "@/lib/square";

/**
 * Best-effort reconcile of a tenant's billing state against Square. Used when a
 * buyer returns from checkout before the webhook has landed (or if a webhook was
 * missed). The webhook remains the authoritative path; this just avoids a
 * "payment processing…" limbo when the data is already available.
 *
 * Returns the resolved SubscriptionStatus, or the tenant's current status if it
 * couldn't be refreshed. Never throws.
 */
export async function reconcileTenantBilling(tenantId: string): Promise<SubscriptionStatus | null> {
  try {
    const t = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { id: true, email: true, billingEmail: true, subscriptionStatus: true },
    });
    if (!t) return null;
    if (!squareConfigured()) return t.subscriptionStatus;

    const email = t.billingEmail || t.email;
    if (!email) return t.subscriptionStatus;

    const sub = await findSubscriptionForEmail(email);
    if (!sub) return t.subscriptionStatus;

    await prisma.tenant.update({
      where: { id: tenantId },
      data: {
        subscriptionStatus: sub.status,
        squareSubscriptionId: sub.id,
        squareCustomerId: sub.customerId,
        ...(sub.planVariationId ? { squarePlanVariationId: sub.planVariationId } : {}),
        ...(sub.status === "ACTIVE" ? { status: "ACTIVE" as const } : {}),
        ...(sub.status === "CANCELED" ? { status: "SUSPENDED" as const } : {}),
      },
    });
    return sub.status;
  } catch (err) {
    console.error("[billing] reconcile failed:", err);
    return null;
  }
}
