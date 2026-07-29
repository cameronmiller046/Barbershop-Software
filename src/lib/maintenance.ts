import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";

const DAY = 86_400_000;

/**
 * Suspend tenants that have been PAST_DUE longer than their (owner-configurable)
 * dunning grace window. This is the app-level grace period on top of Stripe's
 * own retry cadence — access continues for N days, then the shop is suspended.
 */
export async function suspendOverdueTenants(now = new Date()): Promise<number> {
  const overdue = await prisma.tenant.findMany({
    where: { subscriptionStatus: "PAST_DUE", status: { not: "SUSPENDED" }, pastDueSince: { not: null } },
    select: { id: true, pastDueSince: true, dunningGraceDays: true },
  });
  let n = 0;
  for (const t of overdue) {
    if (!t.pastDueSince) continue;
    if (now.getTime() >= t.pastDueSince.getTime() + t.dunningGraceDays * DAY) {
      await prisma.tenant.update({ where: { id: t.id }, data: { status: "SUSPENDED" } });
      await audit({ action: "billing.suspended.dunning", tenantId: t.id, meta: { graceDays: t.dunningGraceDays } });
      n++;
    }
  }
  return n;
}

/** Prune processed-webhook-event rows older than the retention window (TTL). */
export async function cleanupOldWebhookEvents(now = new Date(), retentionDays = 30): Promise<number> {
  const cutoff = new Date(now.getTime() - retentionDays * DAY);
  const res = await prisma.processedWebhookEvent.deleteMany({ where: { processedAt: { lt: cutoff } } });
  return res.count;
}

/** Daily housekeeping — dunning suspensions + webhook-event pruning. Never throws. */
export async function runDailyMaintenance(): Promise<void> {
  try {
    const suspended = await suspendOverdueTenants();
    const pruned = await cleanupOldWebhookEvents();
    if (suspended || pruned) console.log(`[maintenance] suspended ${suspended} overdue tenant(s), pruned ${pruned} webhook event(s)`);
  } catch (e) {
    console.error("[maintenance] failed:", (e as Error).message);
  }
}
