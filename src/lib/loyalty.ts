import { prisma } from "@/lib/prisma";

// The owner-configurable loyalty program. Points accrue on completed visits and
// convert into rewards once a client crosses the threshold.
export type LoyaltyConfig = {
  enabled: boolean;
  pointsPerVisit: number;
  pointsPerDollar: number;
  threshold: number;
  rewardLabel: string;
  rewardValueCents: number;
};

type TenantLoyaltyFields = {
  loyaltyEnabled: boolean;
  loyaltyPointsPerVisit: number;
  loyaltyPointsPerDollar: number;
  loyaltyThreshold: number;
  loyaltyRewardLabel: string;
  loyaltyRewardValueCents: number;
};

/** The tenant fields a LoyaltyConfig is built from (for prisma `select`). */
export const LOYALTY_SELECT = {
  loyaltyEnabled: true, loyaltyPointsPerVisit: true, loyaltyPointsPerDollar: true,
  loyaltyThreshold: true, loyaltyRewardLabel: true, loyaltyRewardValueCents: true,
} as const;

export function loyaltyConfigOf(t: TenantLoyaltyFields): LoyaltyConfig {
  return {
    enabled: t.loyaltyEnabled,
    pointsPerVisit: Math.max(0, t.loyaltyPointsPerVisit),
    pointsPerDollar: Math.max(0, t.loyaltyPointsPerDollar),
    threshold: Math.max(1, t.loyaltyThreshold),
    rewardLabel: t.loyaltyRewardLabel,
    rewardValueCents: Math.max(0, t.loyaltyRewardValueCents),
  };
}

/** Rewards available now and points until the next one, for a given balance. */
export function loyaltyProgress(points: number, threshold: number) {
  const t = Math.max(1, threshold);
  const p = Math.max(0, points);
  return { rewardsAvailable: Math.floor(p / t), toNext: t - (p % t) }; // toNext is 1..t
}

/** How many points a completed visit earns under a config. */
export function pointsForVisit(config: LoyaltyConfig, spentCents: number) {
  const dollars = Math.floor(Math.max(0, spentCents) / 100);
  return config.pointsPerVisit + dollars * config.pointsPerDollar;
}

/**
 * Accrue loyalty points for a COMPLETED appointment. Idempotent via the
 * `loyaltyAwarded` flag, so it's safe to call from every completion path.
 */
export async function accrueLoyalty(appointmentId: string): Promise<void> {
  const appt = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    select: {
      id: true, clientId: true, status: true, loyaltyAwarded: true, collectedCents: true,
      service: { select: { priceCents: true } },
      tenant: {
        select: {
          loyaltyEnabled: true, loyaltyPointsPerVisit: true, loyaltyPointsPerDollar: true,
          loyaltyThreshold: true, loyaltyRewardLabel: true, loyaltyRewardValueCents: true,
        },
      },
    },
  });
  if (!appt || appt.loyaltyAwarded || !appt.clientId || appt.status !== "COMPLETED") return;
  if (!appt.tenant.loyaltyEnabled) return;

  const spent = appt.collectedCents ?? appt.service?.priceCents ?? 0;
  const points = pointsForVisit(loyaltyConfigOf(appt.tenant), spent);

  if (points <= 0) {
    // Nothing to add, but flag it so we never re-scan this appointment.
    await prisma.appointment.update({ where: { id: appt.id }, data: { loyaltyAwarded: true } });
    return;
  }
  await prisma.$transaction([
    prisma.client.update({
      where: { id: appt.clientId },
      data: { loyaltyPoints: { increment: points }, loyaltyLifetimePoints: { increment: points } },
    }),
    prisma.appointment.update({ where: { id: appt.id }, data: { loyaltyAwarded: true } }),
  ]);
}
