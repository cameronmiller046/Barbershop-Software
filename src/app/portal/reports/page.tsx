import { redirect } from "next/navigation";
import { requireStaffWithPerms } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { formatMoney } from "@/lib/utils";
import { can } from "@/lib/permissions";
import { planLimits } from "@/lib/plans";
import {
  monthlyBuckets, dailyCumulative, goalPace, pctChange, avgTicket,
} from "@/lib/reporting";
import { GoalBar } from "@/components/charts/GoalBar";
import { BarChart } from "@/components/charts/BarChart";
import { TrendChart } from "@/components/charts/TrendChart";
import { startOfMonth, endOfMonth, subMonths, getDaysInMonth, getDate, format } from "date-fns";

export const dynamic = "force-dynamic";

function DeltaBadge({ pct }: { pct: number | null }) {
  if (pct === null) return <span className="text-xs text-cream/40">no prior month</span>;
  const up = pct >= 0;
  return (
    <span className={`text-xs font-medium ${up ? "text-emerald-400" : "text-red-400"}`}>
      {up ? "▲" : "▼"} {Math.abs(pct).toFixed(1)}% vs last month
    </span>
  );
}

export default async function ReportsPage() {
  const user = await requireStaffWithPerms();
  // Whole-shop reporting is a Manager capability; Barbers don't see it.
  if (!can(user, "shop.viewAll")) redirect("/portal");
  const tenantId = user.tenantId;

  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { monthlyGoalCents: true, plan: true } });
  if (!planLimits(tenant?.plan ?? "SOLO").reports) redirect("/portal?upgrade=reports");
  const now = new Date();
  const rangeStart = startOfMonth(subMonths(now, 11));
  const monthEnd = endOfMonth(now);

  const [completed, upcoming] = await Promise.all([
    prisma.appointment.findMany({
      where: { tenantId, active: true, status: "COMPLETED", startTime: { gte: rangeStart } },
      include: { service: { select: { priceCents: true } }, barber: { select: { id: true, name: true } } },
      orderBy: { startTime: "asc" },
    }),
    prisma.appointment.findMany({
      where: { tenantId, active: true, status: "CONFIRMED", startTime: { gte: now } },
      include: {
        service: { select: { priceCents: true } },
        barber: { select: { id: true, name: true } },
        client: { select: { name: true } },
      },
      orderBy: { startTime: "asc" },
    }),
  ]);

  // ── Monthly history (last 12 months of realized revenue) ──
  const completedRev = completed.map((a) => ({ startTime: a.startTime, priceCents: a.service.priceCents }));
  const buckets = monthlyBuckets(completedRev, now, 12);
  const thisMonth = buckets[buckets.length - 1];
  const lastMonth = buckets[buckets.length - 2];
  const thisMonthEarned = thisMonth.revenueCents;
  const lastMonthEarned = lastMonth.revenueCents;
  const momPct = pctChange(thisMonthEarned, lastMonthEarned);

  // ── Projection: earned so far + confirmed bookings still to come this month ──
  const upcomingThisMonth = upcoming.filter((a) => a.startTime <= monthEnd);
  const remainingThisMonth = upcomingThisMonth.reduce((t, a) => t + a.service.priceCents, 0);
  const projectedEndOfMonth = thisMonthEarned + remainingThisMonth;
  const upcomingTotal = upcoming.reduce((t, a) => t + a.service.priceCents, 0);

  // ── Goal: explicit setting, or a suggested target from the trailing 3 months ──
  const prior3 = buckets.slice(buckets.length - 4, buckets.length - 1).map((b) => b.revenueCents);
  const prior3Avg = prior3.length ? Math.round(prior3.reduce((a, b) => a + b, 0) / prior3.length) : 0;
  const goalIsSet = (tenant?.monthlyGoalCents ?? 0) > 0;
  const goalCents = goalIsSet ? tenant!.monthlyGoalCents : Math.round(prior3Avg * 1.1);

  // ── Pace: where should we be today vs. where we are ──
  const pace = goalPace(goalCents, now);
  const dayOfMonth = getDate(now);
  const expectedByToday = goalCents > 0 ? pace[dayOfMonth - 1] ?? 0 : 0;
  const paceDiff = thisMonthEarned - expectedByToday;

  // ── Current-month daily trend ──
  const daily = dailyCumulative(completedRev, now);
  const days = Array.from({ length: getDaysInMonth(now) }, (_, i) => i + 1);

  // ── Per-barber breakdown (this month earned + upcoming projected) ──
  const barberMap = new Map<string, { name: string; earned: number; projected: number; upcomingCount: number }>();
  const monthStart = startOfMonth(now);
  for (const a of completed) {
    if (a.startTime < monthStart) continue;
    const row = barberMap.get(a.barber.id) ?? { name: a.barber.name, earned: 0, projected: 0, upcomingCount: 0 };
    row.earned += a.service.priceCents;
    barberMap.set(a.barber.id, row);
  }
  for (const a of upcoming) {
    const row = barberMap.get(a.barber.id) ?? { name: a.barber.name, earned: 0, projected: 0, upcomingCount: 0 };
    row.projected += a.service.priceCents;
    row.upcomingCount += 1;
    barberMap.set(a.barber.id, row);
  }
  const barberRows = [...barberMap.values()].sort((a, b) => b.earned + b.projected - (a.earned + a.projected));

  const kpis = [
    { label: "Last month", value: formatMoney(lastMonthEarned), sub: <span className="text-xs text-cream/40">{lastMonth.label} {lastMonth.year} · {lastMonth.count} cuts</span> },
    { label: "This month so far", value: formatMoney(thisMonthEarned), sub: <DeltaBadge pct={momPct} /> },
    { label: "Projected end of month", value: formatMoney(projectedEndOfMonth), sub: <span className="text-xs text-cream/40">+{formatMoney(remainingThisMonth)} booked ahead</span> },
    { label: "Avg ticket (this month)", value: formatMoney(avgTicket(thisMonthEarned, thisMonth.count)), sub: <span className="text-xs text-cream/40">{thisMonth.count} completed</span> },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl">Reports</h1>
        <p className="mt-1 text-cream/60">Sales performance for {format(now, "MMMM yyyy")}.</p>
      </div>

      {/* KPI row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((k) => (
          <div key={k.label} className="stat">
            <div className="text-xs text-cream/50">{k.label}</div>
            <div className="mt-1 text-2xl font-bold text-brass">{k.value}</div>
            <div className="mt-1">{k.sub}</div>
          </div>
        ))}
      </div>

      {/* Monthly goal */}
      <div className="card">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl">Monthly goal</h2>
          {!goalIsSet && goalCents > 0 && <span className="text-xs text-cream/40">suggested target</span>}
        </div>
        <div className="mt-4">
          <GoalBar earnedCents={thisMonthEarned} goalCents={goalCents} projectedCents={projectedEndOfMonth} format={formatMoney} />
        </div>
        {goalCents > 0 && (
          <p className="mt-4 text-sm text-cream/60">
            {paceDiff >= 0 ? (
              <>You&apos;re <span className="text-emerald-400">{formatMoney(paceDiff)} ahead</span> of the pace needed to hit goal by month-end.</>
            ) : (
              <>You&apos;re <span className="text-red-400">{formatMoney(-paceDiff)} behind</span> the pace needed — about {formatMoney(Math.max(0, goalCents - thisMonthEarned))} still to earn.</>
            )}
          </p>
        )}
      </div>

      {/* This month's trend — full width for readability */}
      <div className="card">
        <h2 className="font-display text-2xl">This month&apos;s trend</h2>
        <p className="mt-1 text-sm text-cream/50">Cumulative earnings vs. goal pace, day by day.</p>
        <div className="mt-4">
          <TrendChart days={days} actualCents={daily.map((d) => d.cumCents)} goalCents={pace} format={formatMoney} />
        </div>
      </div>

      {/* 12-month revenue history */}
      <div className="card">
        <h2 className="font-display text-xl">Revenue — last 12 months</h2>
        <p className="mt-1 text-xs text-cream/50">Realized revenue from completed appointments. Hover a bar for the exact figure.</p>
        <div className="mt-4">
          <BarChart
            bars={buckets.map((b) => ({ label: b.label, value: b.revenueCents, highlight: b.isCurrent }))}
            goalCents={goalCents > 0 ? goalCents : undefined}
            format={formatMoney}
          />
        </div>
      </div>

      {/* Historical table */}
      <div className="card overflow-hidden p-0">
        <div className="p-5 pb-3"><h2 className="font-display text-xl">Monthly breakdown</h2></div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-cream/50">
              <tr className="border-y border-white/10">
                <th className="px-5 py-2.5 font-medium">Month</th>
                <th className="px-5 py-2.5 text-right font-medium">Completed</th>
                <th className="px-5 py-2.5 text-right font-medium">Revenue</th>
                <th className="px-5 py-2.5 text-right font-medium">Avg ticket</th>
                <th className="px-5 py-2.5 text-right font-medium">vs prev</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {buckets.slice().reverse().map((b, i, arr) => {
                const prev = arr[i + 1];
                const delta = prev ? pctChange(b.revenueCents, prev.revenueCents) : null;
                return (
                  <tr key={b.key} className={b.isCurrent ? "bg-brass/5" : ""}>
                    <td className="px-5 py-2.5">{b.label} {b.year}{b.isCurrent ? " (so far)" : ""}</td>
                    <td className="px-5 py-2.5 text-right text-cream/70">{b.count}</td>
                    <td className="px-5 py-2.5 text-right">{formatMoney(b.revenueCents)}</td>
                    <td className="px-5 py-2.5 text-right text-cream/70">{formatMoney(avgTicket(b.revenueCents, b.count))}</td>
                    <td className="px-5 py-2.5 text-right">
                      {delta === null ? <span className="text-cream/30">—</span> : (
                        <span className={delta >= 0 ? "text-emerald-400" : "text-red-400"}>
                          {delta >= 0 ? "+" : ""}{delta.toFixed(0)}%
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Per-barber */}
      <div className="card overflow-hidden p-0">
        <div className="p-5 pb-3"><h2 className="font-display text-xl">By barber</h2></div>
        {barberRows.length === 0 ? (
          <div className="px-5 pb-5 text-cream/60">No activity yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-cream/50">
                <tr className="border-y border-white/10">
                  <th className="px-5 py-2.5 font-medium">Barber</th>
                  <th className="px-5 py-2.5 text-right font-medium">Earned this month</th>
                  <th className="px-5 py-2.5 text-right font-medium">Upcoming</th>
                  <th className="px-5 py-2.5 text-right font-medium">Projected (booked)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {barberRows.map((r) => (
                  <tr key={r.name}>
                    <td className="px-5 py-2.5">{r.name}</td>
                    <td className="px-5 py-2.5 text-right">{formatMoney(r.earned)}</td>
                    <td className="px-5 py-2.5 text-right text-cream/70">{r.upcomingCount}</td>
                    <td className="px-5 py-2.5 text-right text-brass">{formatMoney(r.projected)}</td>
                  </tr>
                ))}
                <tr className="border-t border-white/10 font-medium">
                  <td className="px-5 py-2.5">Shop total</td>
                  <td className="px-5 py-2.5 text-right">{formatMoney(thisMonthEarned)}</td>
                  <td className="px-5 py-2.5 text-right text-cream/70">{upcoming.length}</td>
                  <td className="px-5 py-2.5 text-right text-brass">{formatMoney(upcomingTotal)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
