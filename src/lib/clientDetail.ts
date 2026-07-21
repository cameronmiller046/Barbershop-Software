import { segmentOf, initialsOf } from "@/lib/clientSegments";
import { loyaltyProgress, type LoyaltyConfig } from "@/lib/loyalty";

type ApptLike = {
  id: string; startTime: Date; status: string; collectedCents: number | null; active: boolean;
  service: { name: string; priceCents: number }; barber: { name: string };
};
type ClientLike = {
  id: string; name: string; phone: string | null; email: string | null; notes: string | null;
  createdAt: Date; updatedAt: Date; appointments: ApptLike[];
  loyaltyPoints?: number; loyaltyLifetimePoints?: number; loyaltyRewardsRedeemed?: number;
};

export type Appt = { id: string; service: string; barber: string; dateISO: string; status: string; priceCents: number };
export type LoyaltyDetail = {
  points: number; lifetime: number; redeemed: number;
  threshold: number; rewardLabel: string; rewardsAvailable: number; toNext: number;
};
export type ClientDetail = {
  id: string; name: string; phone: string | null; email: string | null; initials: string;
  memberSinceISO: string; visits: number; spentCents: number;
  isVip: boolean; isActive: boolean; isNew: boolean;
  favoriteServices: string[]; appointments: Appt[];
  last: Appt | null; upcoming: Appt | null;
  notes: string | null; notesUpdatedISO: string;
  loyalty: LoyaltyDetail | null; // null when the program is disabled
};

/** Compute a client's full detail from their (start-desc-ordered) appointments. */
export function computeClientDetail(c: ClientLike, now = Date.now(), loyaltyConfig?: LoyaltyConfig): ClientDetail {
  const active = c.appointments.filter((a) => a.active);
  const completed = active.filter((a) => a.status === "COMPLETED");
  const visits = completed.length;
  const spentCents = completed.reduce((s, a) => s + (a.collectedCents ?? 0), 0);
  const lastCompleted = completed[0] ?? null; // list is start desc
  const lastVisitMs = lastCompleted ? lastCompleted.startTime.getTime() : null;
  const seg = segmentOf({ visits, spentCents, lastVisitMs, createdAtMs: c.createdAt.getTime(), now });

  const counts = new Map<string, number>();
  for (const a of active) counts.set(a.service.name, (counts.get(a.service.name) ?? 0) + 1);
  const favoriteServices = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map((e) => e[0]);

  const toAppt = (a: ApptLike): Appt => ({ id: a.id, service: a.service.name, barber: a.barber.name, dateISO: a.startTime.toISOString(), status: a.status, priceCents: a.collectedCents ?? a.service.priceCents });
  const appointments = active.map(toAppt);
  const upcoming = active
    .filter((a) => a.status === "CONFIRMED" && a.startTime.getTime() >= now)
    .sort((a, b) => a.startTime.getTime() - b.startTime.getTime())[0];

  let loyalty: LoyaltyDetail | null = null;
  if (loyaltyConfig?.enabled) {
    const points = c.loyaltyPoints ?? 0;
    const { rewardsAvailable, toNext } = loyaltyProgress(points, loyaltyConfig.threshold);
    loyalty = {
      points, lifetime: c.loyaltyLifetimePoints ?? 0, redeemed: c.loyaltyRewardsRedeemed ?? 0,
      threshold: loyaltyConfig.threshold, rewardLabel: loyaltyConfig.rewardLabel, rewardsAvailable, toNext,
    };
  }

  return {
    id: c.id, name: c.name, phone: c.phone, email: c.email, initials: initialsOf(c.name),
    memberSinceISO: c.createdAt.toISOString(), visits, spentCents, ...seg,
    favoriteServices, appointments,
    last: lastCompleted ? toAppt(lastCompleted) : null,
    upcoming: upcoming ? toAppt(upcoming) : null,
    notes: c.notes, notesUpdatedISO: c.updatedAt.toISOString(),
    loyalty,
  };
}

export const CLIENT_DETAIL_INCLUDE = {
  appointments: {
    orderBy: { startTime: "desc" as const },
    take: 60,
    include: { service: { select: { name: true, priceCents: true } }, barber: { select: { name: true } } },
  },
};
