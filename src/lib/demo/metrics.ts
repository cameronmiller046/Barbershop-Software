// Pure, client-safe derived metrics over the demo state. No side effects.

import type { Appointment, DemoState } from "./types";

const DAY = 86_400_000;
export const dayKey = (iso: string) => iso.slice(0, 10);
export function startOfDay(d: Date) { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; }
export function addDays(d: Date, n: number) { return new Date(d.getTime() + n * DAY); }
export function sameDay(a: Date, b: Date) { return startOfDay(a).getTime() === startOfDay(b).getTime(); }

export const isRevenue = (a: Appointment) => a.status === "completed";
export const grossOf = (a: Appointment) => (isRevenue(a) ? a.priceCents + a.tipCents : 0);

/** Appointments on a given calendar day, sorted by start. */
export function apptsOn(s: DemoState, day: Date, staffId?: string) {
  return s.appointments
    .filter((a) => sameDay(new Date(a.startISO), day) && (!staffId || a.staffId === staffId))
    .sort((x, y) => x.startISO.localeCompare(y.startISO));
}

export function todayAppts(s: DemoState, staffId?: string) {
  return apptsOn(s, new Date(), staffId);
}

/** Revenue (service + tips) collected today. */
export function revenueToday(s: DemoState, staffId?: string) {
  return todayAppts(s, staffId).reduce((sum, a) => sum + grossOf(a), 0);
}

/** Revenue by day over the last `days` days (oldest → newest). */
export function revenueSeries(s: DemoState, days: number, staffId?: string) {
  const today = startOfDay(new Date());
  const out: { label: string; value: number; date: Date }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = addDays(today, -i);
    const total = s.appointments
      .filter((a) => isRevenue(a) && sameDay(new Date(a.startISO), d) && (!staffId || a.staffId === staffId))
      .reduce((sum, a) => sum + grossOf(a), 0);
    out.push({ label: d.toLocaleDateString(undefined, { weekday: "short" }), value: total, date: d });
  }
  return out;
}

/** Revenue by month for the last `months` months. */
export function revenueByMonth(s: DemoState, months: number, staffId?: string) {
  const now = new Date();
  const out: { label: string; value: number }[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const total = s.appointments
      .filter((a) => {
        const t = new Date(a.startISO);
        return isRevenue(a) && t.getFullYear() === d.getFullYear() && t.getMonth() === d.getMonth() && (!staffId || a.staffId === staffId);
      })
      .reduce((sum, a) => sum + grossOf(a), 0);
    out.push({ label: d.toLocaleDateString(undefined, { month: "short" }), value: total });
  }
  return out;
}

/** Total service + tip revenue over all completed appointments (optionally by staff). */
export function totalRevenue(s: DemoState, staffId?: string) {
  return s.appointments.filter((a) => isRevenue(a) && (!staffId || a.staffId === staffId)).reduce((sum, a) => sum + grossOf(a), 0);
}
export function totalTips(s: DemoState, staffId?: string) {
  return s.appointments.filter((a) => isRevenue(a) && (!staffId || a.staffId === staffId)).reduce((sum, a) => sum + a.tipCents, 0);
}
export function completedCount(s: DemoState, staffId?: string) {
  return s.appointments.filter((a) => a.status === "completed" && (!staffId || a.staffId === staffId)).length;
}

/** Revenue grouped by service name (completed only). */
export function revenueByService(s: DemoState, staffId?: string) {
  const map = new Map<string, number>();
  for (const a of s.appointments) {
    if (!isRevenue(a) || (staffId && a.staffId !== staffId)) continue;
    const svc = s.services.find((v) => v.id === a.serviceId);
    if (!svc) continue;
    map.set(svc.name, (map.get(svc.name) ?? 0) + a.priceCents);
  }
  return [...map.entries()].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
}

/** Commission owed to a barber over completed appointments. */
export function commissionOf(s: DemoState, staffId: string) {
  const staff = s.staff.find((x) => x.id === staffId);
  const rate = (staff?.commissionRate ?? 0) / 100;
  const service = s.appointments.filter((a) => a.status === "completed" && a.staffId === staffId).reduce((sum, a) => sum + a.priceCents, 0);
  const tips = totalTips(s, staffId);
  return { serviceCents: service, commissionCents: Math.round(service * rate), tipsCents: tips, rate };
}

export const lowStock = (s: DemoState) => s.inventory.filter((i) => i.stock <= i.reorderLevel);
