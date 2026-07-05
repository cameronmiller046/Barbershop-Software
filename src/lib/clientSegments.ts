// Client segmentation (VIP / New / Active / Inactive) derived from real activity.
const DAY = 86_400_000;
export const SEGMENTS = { newDays: 30, activeDays: 90, vipSpentCents: 50_000, vipVisits: 15 };

export type Segment = { isNew: boolean; isVip: boolean; isActive: boolean };

export function segmentOf(p: { visits: number; spentCents: number; lastVisitMs: number | null; createdAtMs: number; now: number }): Segment {
  const isNew = p.now - p.createdAtMs <= SEGMENTS.newDays * DAY;
  const isVip = p.spentCents >= SEGMENTS.vipSpentCents || p.visits >= SEGMENTS.vipVisits;
  const isActive = p.lastVisitMs != null && p.now - p.lastVisitMs <= SEGMENTS.activeDays * DAY;
  return { isNew, isVip, isActive };
}

export function initialsOf(name: string) {
  return name.split(" ").map((n) => n[0]).filter(Boolean).slice(0, 2).join("").toUpperCase() || "?";
}
