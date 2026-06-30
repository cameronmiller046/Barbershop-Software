import { startOfMonth, endOfMonth, subMonths, getDaysInMonth, getDate, format } from "date-fns";

// Minimal shape the reporting math needs from an appointment.
export type RevenueAppt = { startTime: Date; priceCents: number };

export type MonthBucket = {
  key: string;
  label: string; // "Jan"
  year: number;
  month: number; // 0-indexed
  revenueCents: number;
  count: number;
  isCurrent: boolean;
};

/** Build `months` monthly revenue buckets, ending with the current month. */
export function monthlyBuckets(appts: RevenueAppt[], now: Date, months = 12): MonthBucket[] {
  const curKey = `${now.getFullYear()}-${now.getMonth()}`;
  const buckets: MonthBucket[] = [];
  const index = new Map<string, MonthBucket>();
  for (let i = months - 1; i >= 0; i--) {
    const d = startOfMonth(subMonths(now, i));
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    const b: MonthBucket = {
      key, label: format(d, "MMM"), year: d.getFullYear(), month: d.getMonth(),
      revenueCents: 0, count: 0, isCurrent: key === curKey,
    };
    buckets.push(b);
    index.set(key, b);
  }
  for (const a of appts) {
    const key = `${a.startTime.getFullYear()}-${a.startTime.getMonth()}`;
    const b = index.get(key);
    if (b) { b.revenueCents += a.priceCents; b.count += 1; }
  }
  return buckets;
}

export type DayPoint = { day: number; cumCents: number };

/**
 * Cumulative revenue per day for the current month, up to today only
 * (future days are left out so the trend line stops at "now").
 */
export function dailyCumulative(appts: RevenueAppt[], now: Date): DayPoint[] {
  const start = startOfMonth(now);
  const end = endOfMonth(now);
  const today = getDate(now);
  const perDay = new Array(getDaysInMonth(now) + 1).fill(0); // 1-indexed
  for (const a of appts) {
    if (a.startTime >= start && a.startTime <= end) perDay[getDate(a.startTime)] += a.priceCents;
  }
  const points: DayPoint[] = [];
  let cum = 0;
  for (let d = 1; d <= today; d++) { cum += perDay[d]; points.push({ day: d, cumCents: cum }); }
  return points;
}

/** A straight-line "pace" to hit `goalCents` evenly across the month. */
export function goalPace(goalCents: number, now: Date): number[] {
  const days = getDaysInMonth(now);
  return Array.from({ length: days }, (_, i) => Math.round((goalCents * (i + 1)) / days));
}

/** Percent change between two values; null when there's no prior baseline. */
export function pctChange(current: number, prior: number): number | null {
  if (prior <= 0) return null;
  return ((current - prior) / prior) * 100;
}

export function avgTicket(revenueCents: number, count: number): number {
  return count > 0 ? Math.round(revenueCents / count) : 0;
}
