import { prisma } from "@/lib/prisma";

// ── Fixed guardrails (business rules, not owner-editable) ──
export const LOYALTY_MAX_POINTS = 200; // a client can never bank more than this
export const LOYALTY_MAX_REWARD_CENTS = 1000; // a reward is worth at most $10 off
export const LOYALTY_THRESHOLD_MAX = 100; // a reward costs at most 100 points
export const LOYALTY_EXPIRY_DAYS = 90; // points age out ~3 months after they're earned

// The owner-configurable loyalty program (within the guardrails above).
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

/** Tenant fields a LoyaltyConfig is built from (for prisma `select`). */
export const LOYALTY_SELECT = {
  loyaltyEnabled: true, loyaltyPointsPerVisit: true, loyaltyPointsPerDollar: true,
  loyaltyThreshold: true, loyaltyRewardLabel: true, loyaltyRewardValueCents: true,
} as const;

export function loyaltyConfigOf(t: TenantLoyaltyFields): LoyaltyConfig {
  return {
    enabled: t.loyaltyEnabled,
    pointsPerVisit: clampInt(t.loyaltyPointsPerVisit, 0, 1000),
    pointsPerDollar: clampInt(t.loyaltyPointsPerDollar, 0, 100),
    threshold: clampInt(t.loyaltyThreshold, 1, LOYALTY_THRESHOLD_MAX),
    rewardLabel: t.loyaltyRewardLabel,
    rewardValueCents: clampInt(t.loyaltyRewardValueCents, 0, LOYALTY_MAX_REWARD_CENTS),
  };
}

function clampInt(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, Math.round(Number.isFinite(n) ? n : min)));
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

/** A client's live redeemable balance — the sum of unexpired, unredeemed points. */
export async function liveLoyaltyBalance(clientId: string, now = new Date()): Promise<number> {
  const agg = await prisma.loyaltyEntry.aggregate({
    where: { clientId, expiresAt: { gt: now } },
    _sum: { points: true, redeemed: true },
  });
  return Math.max(0, (agg._sum.points ?? 0) - (agg._sum.redeemed ?? 0));
}

/**
 * Accrue loyalty points for a COMPLETED appointment as a ledger entry that
 * expires in 90 days. Idempotent (via the appointment's loyaltyAwarded flag),
 * caps the client's live balance at LOYALTY_MAX_POINTS, and no-ops unless the
 * program is enabled.
 */
export async function accrueLoyalty(appointmentId: string): Promise<void> {
  const appt = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    select: {
      id: true, tenantId: true, clientId: true, status: true, loyaltyAwarded: true, collectedCents: true,
      service: { select: { priceCents: true } },
      tenant: { select: LOYALTY_SELECT },
    },
  });
  if (!appt || appt.loyaltyAwarded || !appt.clientId || appt.status !== "COMPLETED") return;
  if (!appt.tenant.loyaltyEnabled) return;

  const config = loyaltyConfigOf(appt.tenant);
  const spent = appt.collectedCents ?? appt.service?.priceCents ?? 0;
  const balance = await liveLoyaltyBalance(appt.clientId);
  // Earn what the config says, but never push the live balance past the cap.
  const points = Math.max(0, Math.min(pointsForVisit(config, spent), LOYALTY_MAX_POINTS - balance));

  const ops: import("@prisma/client").Prisma.PrismaPromise<unknown>[] = [
    prisma.appointment.update({ where: { id: appt.id }, data: { loyaltyAwarded: true } }),
  ];
  if (points > 0) {
    const now = new Date();
    ops.push(
      prisma.loyaltyEntry.create({
        data: {
          tenantId: appt.tenantId, clientId: appt.clientId, points,
          earnedAt: now, expiresAt: new Date(now.getTime() + LOYALTY_EXPIRY_DAYS * 86_400_000),
          appointmentId: appt.id,
        },
      }),
      prisma.client.update({ where: { id: appt.clientId }, data: { loyaltyLifetimePoints: { increment: points } } }),
    );
  }
  await prisma.$transaction(ops);
}

/**
 * Redeem one reward for a client: consume `threshold` points from the oldest
 * live ledger entries first (FIFO). Returns true if a reward was redeemed.
 */
export async function consumeLoyaltyReward(clientId: string, threshold: number): Promise<boolean> {
  const now = new Date();
  const balance = await liveLoyaltyBalance(clientId, now);
  if (balance < threshold) return false;

  const entries = await prisma.loyaltyEntry.findMany({
    where: { clientId, expiresAt: { gt: now } },
    orderBy: { earnedAt: "asc" },
    select: { id: true, points: true, redeemed: true },
  });
  let remaining = threshold;
  const ops: import("@prisma/client").Prisma.PrismaPromise<unknown>[] = [];
  for (const e of entries) {
    if (remaining <= 0) break;
    const avail = e.points - e.redeemed;
    if (avail <= 0) continue;
    const take = Math.min(avail, remaining);
    ops.push(prisma.loyaltyEntry.update({ where: { id: e.id }, data: { redeemed: { increment: take } } }));
    remaining -= take;
  }
  if (remaining > 0) return false; // shouldn't happen (balance checked), but stay safe
  ops.push(prisma.client.update({ where: { id: clientId }, data: { loyaltyRewardsRedeemed: { increment: 1 } } }));
  await prisma.$transaction(ops);
  return true;
}
