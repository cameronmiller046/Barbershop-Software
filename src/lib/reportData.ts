import {
  startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, addDays, addWeeks, addMonths, format,
} from "date-fns";
import type { Gran, Range } from "@/lib/reportRange";

export type ApptRow = {
  startTime: Date; startedAt: Date | null; finishedAt: Date | null; collectedCents: number | null;
  status: string; kind: string; referral: string | null; clientId: string; clientName: string;
  barberId: string; barberName: string; serviceName: string; servicePriceCents: number; serviceDurationMin: number;
};
export type ClientRow = { id: string; createdAt: Date };
export type TimeRow = { userId: string; clockIn: Date; clockOut: Date | null };

export type WindowStats = {
  revenue: number; apptCount: number; completedCount: number; cancelled: number; noShow: number;
  walkin: number; online: number; avgTicket: number; avgServiceMin: number; noShowRate: number;
  activeClients: number; newClients: number; returningClients: number; utilization: number | null;
};

const rev = (a: ApptRow) => a.collectedCents ?? a.servicePriceCents;
const mins = (a: ApptRow) => (a.startedAt && a.finishedAt ? (a.finishedAt.getTime() - a.startedAt.getTime()) / 60_000 : null);

function windowStats(appts: ApptRow[], from: Date, to: Date, clientCreated: Map<string, Date>, times: TimeRow[]): WindowStats {
  const inWin = appts.filter((a) => a.startTime >= from && a.startTime <= to);
  const completed = inWin.filter((a) => a.status === "COMPLETED");
  const revenue = completed.reduce((s, a) => s + rev(a), 0);
  const completedCount = completed.length;
  const confirmed = inWin.filter((a) => a.status === "CONFIRMED").length;
  const cancelled = inWin.filter((a) => a.status === "CANCELLED").length;
  const noShow = inWin.filter((a) => a.status === "NO_SHOW").length;
  const walkin = completed.filter((a) => a.kind === "WALKIN").length;
  const svc = completed.map(mins).filter((m): m is number => m != null);
  const active = new Set(inWin.map((a) => a.clientId));
  let newC = 0, ret = 0;
  for (const id of active) {
    const cr = clientCreated.get(id);
    if (cr && cr >= from && cr <= to) newC++; else if (cr && cr < from) ret++;
  }
  const bookedMin = completed.reduce((s, a) => s + a.serviceDurationMin, 0);
  const clockedMin = times.filter((e) => e.clockIn >= from && e.clockIn <= to && e.clockOut).reduce((s, e) => s + (e.clockOut!.getTime() - e.clockIn.getTime()) / 60_000, 0);
  const totalOutcome = completedCount + noShow + cancelled;
  return {
    revenue, apptCount: completedCount + confirmed, completedCount, cancelled, noShow,
    walkin, online: completedCount - walkin,
    avgTicket: completedCount ? Math.round(revenue / completedCount) : 0,
    avgServiceMin: svc.length ? Math.round(svc.reduce((s, x) => s + x, 0) / svc.length) : 0,
    noShowRate: totalOutcome ? noShow / totalOutcome : 0,
    activeClients: active.size, newClients: newC, returningClients: ret,
    utilization: clockedMin > 0 ? Math.min(1, bookedMin / clockedMin) : null,
  };
}

function bucketize(from: Date, to: Date, gran: Gran): { start: Date; end: Date; label: string }[] {
  const out: { start: Date; end: Date; label: string }[] = [];
  if (gran === "hour") {
    let cur = new Date(from.getFullYear(), from.getMonth(), from.getDate(), from.getHours());
    while (cur <= to) { const end = new Date(cur.getTime() + 3_600_000); out.push({ start: new Date(cur), end, label: `${((cur.getHours() + 11) % 12) + 1}${cur.getHours() < 12 ? "a" : "p"}` }); cur = end; }
  } else if (gran === "day") {
    let cur = startOfDay(from);
    while (cur <= to) { out.push({ start: new Date(cur), end: endOfDay(cur), label: format(cur, "M/d") }); cur = addDays(cur, 1); }
  } else if (gran === "week") {
    let cur = startOfWeek(from);
    while (cur <= to) { out.push({ start: new Date(cur), end: endOfWeek(cur), label: format(cur, "MMM d") }); cur = addWeeks(cur, 1); }
  } else {
    let cur = startOfMonth(from);
    while (cur <= to) { out.push({ start: new Date(cur), end: endOfMonth(cur), label: format(cur, "MMM") }); cur = addMonths(cur, 1); }
  }
  return out;
}

const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function buildReport(appts: ApptRow[], clients: ClientRow[], times: TimeRow[], range: Range) {
  const clientCreated = new Map(clients.map((c) => [c.id, c.createdAt]));
  const cur = windowStats(appts, range.from, range.to, clientCreated, times);
  const prev = windowStats(appts, range.prevFrom, range.prevTo, clientCreated, times);

  const inWin = appts.filter((a) => a.startTime >= range.from && a.startTime <= range.to);
  const completed = inWin.filter((a) => a.status === "COMPLETED");

  // Time series (current + aligned previous)
  const curB = bucketize(range.from, range.to, range.gran);
  const prevB = bucketize(range.prevFrom, range.prevTo, range.gran);
  const revInBucket = (b: { start: Date; end: Date }, list: ApptRow[]) => list.filter((a) => a.startTime >= b.start && a.startTime <= b.end).reduce((s, a) => s + rev(a), 0);
  const cntInBucket = (b: { start: Date; end: Date }, list: ApptRow[]) => list.filter((a) => a.startTime >= b.start && a.startTime <= b.end).length;
  const prevCompleted = appts.filter((a) => a.status === "COMPLETED" && a.startTime >= range.prevFrom && a.startTime <= range.prevTo);
  const revenueSeries = curB.map((b, i) => ({ label: b.label, value: revInBucket(b, completed), prevValue: prevB[i] ? revInBucket(prevB[i], prevCompleted) : 0 }));
  const apptSeries = curB.map((b) => ({ label: b.label, value: cntInBucket(b, inWin.filter((a) => a.status === "COMPLETED" || a.status === "CONFIRMED")) }));

  // Barber breakdown
  const barberMap = new Map<string, { id: string; name: string; revenue: number; appts: number; clients: Set<string>; svc: number[]; noShow: number; cancelled: number }>();
  for (const a of inWin) {
    const r = barberMap.get(a.barberId) ?? { id: a.barberId, name: a.barberName, revenue: 0, appts: 0, clients: new Set<string>(), svc: [], noShow: 0, cancelled: 0 };
    if (a.status === "COMPLETED") { r.revenue += rev(a); r.appts++; r.clients.add(a.clientId); const m = mins(a); if (m != null) r.svc.push(m); }
    if (a.status === "NO_SHOW") r.noShow++;
    if (a.status === "CANCELLED") r.cancelled++;
    barberMap.set(a.barberId, r);
  }
  const clockedByUser = new Map<string, number>();
  for (const e of times) if (e.clockIn >= range.from && e.clockIn <= range.to && e.clockOut) clockedByUser.set(e.userId, (clockedByUser.get(e.userId) ?? 0) + (e.clockOut.getTime() - e.clockIn.getTime()) / 60_000);
  const byBarber = [...barberMap.values()].map((r) => {
    const booked = r.svc.reduce((s, x) => s + x, 0);
    const clocked = clockedByUser.get(r.id) ?? 0;
    return {
      id: r.id, name: r.name, revenue: r.revenue, appts: r.appts, clients: r.clients.size,
      avgServiceMin: r.svc.length ? Math.round(booked / r.svc.length) : 0,
      noShow: r.noShow, cancelled: r.cancelled,
      utilization: clocked > 0 ? Math.min(1, booked / clocked) : null,
    };
  }).sort((a, b) => b.revenue - a.revenue);

  // Service breakdown
  const svcMap = new Map<string, { name: string; count: number; revenue: number; dur: number[]; price: number[] }>();
  for (const a of completed) {
    const r = svcMap.get(a.serviceName) ?? { name: a.serviceName, count: 0, revenue: 0, dur: [], price: [] };
    r.count++; r.revenue += rev(a); r.dur.push(a.serviceDurationMin); r.price.push(a.servicePriceCents);
    svcMap.set(a.serviceName, r);
  }
  const totalSvcRev = completed.reduce((s, a) => s + rev(a), 0) || 1;
  const byService = [...svcMap.values()].map((r) => ({
    name: r.name, count: r.count, revenue: r.revenue,
    avgPrice: Math.round(r.price.reduce((s, x) => s + x, 0) / r.price.length),
    avgDur: Math.round(r.dur.reduce((s, x) => s + x, 0) / r.dur.length),
    share: r.revenue / totalSvcRev,
  })).sort((a, b) => b.revenue - a.revenue);

  // Day-of-week + hour + heatmap
  const byDow = DOW.map((label) => ({ label, revenue: 0, count: 0 }));
  const byHour = Array.from({ length: 24 }, (_, h) => ({ hour: h, revenue: 0, count: 0 }));
  const heatmap = Array.from({ length: 7 }, () => Array.from({ length: 24 }, () => 0));
  for (const a of completed) {
    const d = a.startTime.getDay(), h = a.startTime.getHours();
    byDow[d].revenue += rev(a); byDow[d].count++;
    byHour[h].revenue += rev(a); byHour[h].count++;
    heatmap[d][h]++;
  }

  // Status + channel
  const status = {
    completed: cur.completedCount,
    confirmed: inWin.filter((a) => a.status === "CONFIRMED").length,
    cancelled: cur.cancelled, noShow: cur.noShow,
  };
  const channel = { walkin: cur.walkin, online: cur.online };

  // Top clients + referrals
  const clientMap = new Map<string, { name: string; spend: number; visits: number }>();
  for (const a of completed) {
    const r = clientMap.get(a.clientId) ?? { name: a.clientName, spend: 0, visits: 0 };
    r.spend += rev(a); r.visits++; clientMap.set(a.clientId, r);
  }
  const topClients = [...clientMap.values()].sort((a, b) => b.spend - a.spend).slice(0, 6);
  const refMap = new Map<string, number>();
  for (const a of inWin) if (a.referral) refMap.set(a.referral, (refMap.get(a.referral) ?? 0) + 1);
  const referrals = [...refMap.entries()].map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count);

  const insights = buildInsights(cur, prev, byBarber, byService, byDow, byHour, cur.utilization);

  return { cur, prev, revenueSeries, apptSeries, byBarber, byService, byDow, byHour, heatmap, status, channel, topClients, referrals, insights };
}

const pct = (a: number, b: number) => (b > 0 ? Math.round(((a - b) / b) * 100) : a > 0 ? 100 : 0);
const money = (c: number) => `$${(c / 100).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
const hr = (h: number) => `${((h + 11) % 12) + 1}${h < 12 ? "am" : "pm"}`;

function buildInsights(cur: WindowStats, prev: WindowStats, byBarber: { name: string; revenue: number; clients: number }[], byService: { name: string; count: number }[], byDow: { label: string; revenue: number }[], byHour: { hour: number; revenue: number; count: number }[], util: number | null): string[] {
  const out: string[] = [];
  const revP = pct(cur.revenue, prev.revenue);
  if (cur.revenue > 0 || prev.revenue > 0) out.push(`Revenue is ${revP >= 0 ? "up" : "down"} ${Math.abs(revP)}% (${money(cur.revenue)}) versus the previous period.`);
  if (cur.avgTicket && prev.avgTicket) { const d = cur.avgTicket - prev.avgTicket; if (Math.abs(d) >= 100) out.push(`Your average ticket ${d >= 0 ? "increased" : "decreased"} by ${money(Math.abs(d))} to ${money(cur.avgTicket)}.`); }
  const dows = [...byDow].filter((d) => d.revenue > 0).sort((a, b) => b.revenue - a.revenue);
  if (dows.length >= 2) { const best = dows[0], worst = dows[dows.length - 1]; if (worst.revenue > 0) { const p = pct(best.revenue, worst.revenue); if (p >= 15) out.push(`${best.label}s generate ${p}% more revenue than ${worst.label}s — your strongest day.`); } }
  const busyHour = [...byHour].sort((a, b) => b.count - a.count)[0]; if (busyHour && busyHour.count > 0) out.push(`Your busiest hour is around ${hr(busyHour.hour)}.`);
  const topB = byBarber[0]; if (topB && topB.revenue > 0) out.push(`${topB.name} generated the most revenue (${money(topB.revenue)}) across ${topB.clients} clients.`);
  const topS = [...byService].sort((a, b) => b.count - a.count)[0]; if (topS) out.push(`${topS.name} is your most-booked service (${topS.count} bookings).`);
  if (cur.noShow >= 3 && cur.noShowRate >= 0.1) out.push(`No-show rate is ${Math.round(cur.noShowRate * 100)}% (${cur.noShow}) — consider reminders or deposits.`);
  if (util != null && util < 0.5 && cur.completedCount > 5) out.push(`Chair utilization is ${Math.round(util * 100)}% — there's room to book more into open hours.`);
  if (dows.length && cur.completedCount > 10) { const best = dows[0]; out.push(`${best.label} is your busiest day — make sure it's fully staffed.`); }
  return out.slice(0, 6);
}
