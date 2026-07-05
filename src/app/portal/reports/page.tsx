import { redirect } from "next/navigation";
import Link from "next/link";
import { requireStaffWithPerms } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/permissions";
import { planLimits } from "@/lib/plans";
import { formatMoney } from "@/lib/utils";
import { resolveRange } from "@/lib/reportRange";
import { buildReport, type ApptRow } from "@/lib/reportData";
import { DatePreset } from "@/components/reports/DatePreset";
import { AreaTrend, Bars, Donut, Heatmap, Sparkline, RankBar } from "@/components/reports/charts";
import { Reveal, Stagger, Item } from "@/components/home/motion";
import { Icon, type IconName } from "@/components/home/icons";
import { startOfDay, endOfDay, startOfWeek, startOfMonth, startOfYear, subYears } from "date-fns";

export const dynamic = "force-dynamic";

const pct = (a: number, b: number) => (b > 0 ? Math.round(((a - b) / b) * 100) : a > 0 ? 100 : 0);
const PAY_COLORS = ["#d8b25c", "#34d399", "#60a5fa", "#c084fc", "#94a3b8"];

export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ preset?: string; from?: string; to?: string }> }) {
  const user = await requireStaffWithPerms();
  if (!can(user, "shop.viewAll")) redirect("/portal");
  const tenantId = user.tenantId;
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { plan: true } });
  if (!planLimits(tenant?.plan ?? "SOLO").reports) redirect("/portal?upgrade=reports");

  const sp = await searchParams;
  const now = new Date();
  const range = resolveRange(sp.preset ?? "last30", now, sp.from, sp.to);
  const sumRev = (f: Date, t: Date) => prisma.appointment.aggregate({ where: { tenantId, active: true, status: "COMPLETED", startTime: { gte: f, lte: t } }, _sum: { collectedCents: true } }).then((r) => r._sum.collectedCents ?? 0);
  const yoyFrom = subYears(range.from, 1), yoyTo = subYears(range.to, 1);

  const sumTips = (f: Date, t: Date) => prisma.appointment.aggregate({ where: { tenantId, active: true, status: "COMPLETED", startTime: { gte: f, lte: t } }, _sum: { tipCents: true } }).then((r) => r._sum.tipCents ?? 0);
  const [apptRows, clients, times, snapT, snapW, snapM, snapY, yoyRev, yoyAppts, yoyTips] = await Promise.all([
    prisma.appointment.findMany({
      where: { tenantId, active: true, startTime: { gte: range.prevFrom, lte: range.to } },
      select: { startTime: true, startedAt: true, finishedAt: true, collectedCents: true, tipCents: true, paymentMethod: true, status: true, kind: true, referral: true, clientId: true, client: { select: { name: true } }, barberId: true, barber: { select: { name: true } }, service: { select: { name: true, priceCents: true, durationMin: true } } },
      orderBy: { startTime: "asc" },
    }),
    prisma.client.findMany({ where: { tenantId }, select: { id: true, createdAt: true }, take: 20000 }),
    prisma.timeEntry.findMany({ where: { tenantId, clockIn: { gte: range.prevFrom, lte: range.to } }, select: { userId: true, clockIn: true, clockOut: true } }),
    sumRev(startOfDay(now), endOfDay(now)), sumRev(startOfWeek(now), endOfDay(now)), sumRev(startOfMonth(now), endOfDay(now)), sumRev(startOfYear(now), endOfDay(now)),
    sumRev(yoyFrom, yoyTo),
    prisma.appointment.count({ where: { tenantId, active: true, status: "COMPLETED", startTime: { gte: yoyFrom, lte: yoyTo } } }),
    sumTips(yoyFrom, yoyTo),
  ]);

  const appts: ApptRow[] = apptRows.map((a) => ({
    startTime: a.startTime, startedAt: a.startedAt, finishedAt: a.finishedAt, collectedCents: a.collectedCents,
    tipCents: a.tipCents, paymentMethod: a.paymentMethod,
    status: a.status, kind: a.kind, referral: a.referral, clientId: a.clientId, clientName: a.client.name,
    barberId: a.barberId, barberName: a.barber.name, serviceName: a.service.name, servicePriceCents: a.service.priceCents, serviceDurationMin: a.service.durationMin,
  }));
  const R = buildReport(appts, clients, times, range);
  const { cur, prev } = R;

  const kpis: { label: string; icon: IconName; value: string; delta: number | null; spark?: number[]; invert?: boolean }[] = [
    { label: "Revenue", icon: "dollar", value: formatMoney(cur.revenue), delta: pct(cur.revenue, prev.revenue), spark: R.revenueSeries.map((s) => s.value) },
    { label: "Appointments", icon: "booking", value: String(cur.apptCount), delta: pct(cur.apptCount, prev.apptCount), spark: R.apptSeries.map((s) => s.value) },
    { label: "Completed Cuts", icon: "check", value: String(cur.completedCount), delta: pct(cur.completedCount, prev.completedCount) },
    { label: "Avg Ticket", icon: "gauge", value: formatMoney(cur.avgTicket), delta: pct(cur.avgTicket, prev.avgTicket) },
    { label: "Tips Collected", icon: "loyalty", value: formatMoney(cur.tips), delta: pct(cur.tips, prev.tips) },
    { label: "New Clients", icon: "customers", value: String(cur.newClients), delta: pct(cur.newClients, prev.newClients) },
    { label: "Returning Clients", icon: "loyalty", value: String(cur.returningClients), delta: pct(cur.returningClients, prev.returningClients) },
    { label: "Avg Service Time", icon: "clock", value: `${cur.avgServiceMin}m`, delta: pct(cur.avgServiceMin, prev.avgServiceMin) },
    { label: "No-Show Rate", icon: "notifications", value: `${Math.round(cur.noShowRate * 100)}%`, delta: pct(Math.round(cur.noShowRate * 1000), Math.round(prev.noShowRate * 1000)), invert: true },
    { label: "Utilization", icon: "activity", value: cur.utilization != null ? `${Math.round(cur.utilization * 100)}%` : "—", delta: cur.utilization != null && prev.utilization != null ? pct(Math.round(cur.utilization * 1000), Math.round(prev.utilization * 1000)) : null },
    { label: "Cancellations", icon: "reports", value: String(cur.cancelled), delta: pct(cur.cancelled, prev.cancelled), invert: true },
  ];

  const maxBarberRev = Math.max(1, ...R.byBarber.map((b) => b.revenue));
  const exportHref = `/portal/reports/export?preset=${range.preset}${sp.from ? `&from=${sp.from}` : ""}${sp.to ? `&to=${sp.to}` : ""}`;

  // Drill-down: build a Custom Report URL that carries the current date range.
  const drill = (params: Record<string, string>) => {
    const qs = new URLSearchParams({ preset: range.preset, ...(sp.from ? { from: sp.from } : {}), ...(sp.to ? { to: sp.to } : {}), ...params });
    return `/portal/reports/builder?${qs.toString()}`;
  };
  // KPI → the metric+grouping that best explains it.
  const KPI_DRILL: Record<string, string> = {
    "Revenue": drill({ metric: "revenue", dim: "day" }),
    "Appointments": drill({ metric: "appointments", dim: "day" }),
    "Completed Cuts": drill({ metric: "completed", dim: "barber" }),
    "Avg Ticket": drill({ metric: "avgTicket", dim: "service" }),
    "Tips Collected": drill({ metric: "tips", dim: "barber" }),
    "New Clients": drill({ metric: "clients", dim: "day" }),
    "Returning Clients": drill({ metric: "clients", dim: "day" }),
    "Avg Service Time": drill({ metric: "completed", dim: "service" }),
    "No-Show Rate": drill({ metric: "noShows", dim: "barber" }),
    "Utilization": drill({ metric: "completed", dim: "barber" }),
    "Cancellations": drill({ metric: "cancellations", dim: "barber" }),
  };

  return (
    <div className="mx-auto max-w-[1500px]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl text-cream sm:text-3xl">Reports &amp; Analytics</h1>
          <p className="mt-1 text-cream/55">{range.label} · compared to the previous period</p>
        </div>
        <div className="flex items-center gap-2">
          <DatePreset current={range.preset} />
          <Link href={drill({ metric: "revenue", dim: "barber" })} className="p-btn-gold"><Icon.reports className="h-4 w-4" /> Build Custom Report</Link>
          <a href={exportHref} className="p-btn-ghost"><Icon.arrow className="h-4 w-4" /> Export CSV</a>
        </div>
      </div>

      {/* Revenue snapshot */}
      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {([["Revenue Today", snapT], ["This Week", snapW], ["This Month", snapM], ["This Year", snapY]] as const).map(([label, v], i) => (
          <Reveal key={label} delay={i * 0.05} className="p-panel p-5">
            <div className="text-xs text-cream/50">{label}</div>
            <div className="mt-1 font-display text-2xl font-semibold text-brass sm:text-3xl">{formatMoney(v)}</div>
          </Reveal>
        ))}
      </div>

      {/* KPI grid */}
      <Stagger className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5" gap={0.04}>
        {kpis.map((k) => {
          const KI = Icon[k.icon];
          return (
            <Item key={k.label}>
              <Link href={KPI_DRILL[k.label] ?? drill({ metric: "revenue", dim: "barber" })} className="group block">
                <div className="p-panel p-kpi p-5 transition group-hover:border-brass/40">
                  <div className="flex items-start justify-between">
                    <span className="text-xs text-cream/50">{k.label}</span>
                    <span className="grid h-8 w-8 place-items-center rounded-lg border border-brass/25 bg-brass/[0.07] text-brass"><KI className="h-4 w-4" /></span>
                  </div>
                  <div className="mt-2 font-display text-2xl font-semibold text-cream tabular-nums">{k.value}</div>
                  <div className="mt-1"><Delta n={k.delta} invert={k.invert} /></div>
                  {k.spark && <div className="mt-2"><Sparkline values={k.spark} up={(k.delta ?? 0) >= 0} /></div>}
                </div>
              </Link>
            </Item>
          );
        })}
      </Stagger>

      {/* Revenue trend */}
      <Reveal className="mt-5 p-panel p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg text-cream">Revenue trend</h2>
          <span className="flex items-center gap-3 text-xs text-cream/45">
            <span className="flex items-center gap-1.5"><span className="h-0.5 w-4 rounded bg-brass" /> This period</span>
            <span className="flex items-center gap-1.5"><span className="h-0.5 w-4 rounded bg-white/30" /> Previous</span>
          </span>
        </div>
        <div className="mt-4"><AreaTrend points={R.revenueSeries} money /></div>
      </Reveal>

      {/* Mid grid: day-of-week + status donut + channel */}
      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        <Reveal className="p-panel p-5">
          <h3 className="font-display text-lg text-cream">Revenue by day of week</h3>
          <div className="mt-5"><Bars items={R.byDow.map((d) => ({ label: d.label, value: d.revenue }))} money
            links={R.byDow.map(() => drill({ metric: "revenue", dim: "dayOfWeek" }))} /></div>
        </Reveal>
        <Reveal delay={0.05} className="p-panel p-5">
          <h3 className="font-display text-lg text-cream">Appointment outcomes</h3>
          <div className="mt-5"><Donut segments={[
            { label: "Completed", value: R.status.completed, color: "#34d399" },
            { label: "Scheduled", value: R.status.confirmed, color: "#d8b25c" },
            { label: "Cancelled", value: R.status.cancelled, color: "#f87171" },
            { label: "No-show", value: R.status.noShow, color: "#94a3b8" },
          ]} links={[
            drill({ metric: "completed", dim: "status", status: "COMPLETED" }),
            drill({ metric: "appointments", dim: "status", status: "CONFIRMED" }),
            drill({ metric: "cancellations", dim: "status", status: "CANCELLED" }),
            drill({ metric: "noShows", dim: "status", status: "NO_SHOW" }),
          ]} /></div>
        </Reveal>
        <Reveal delay={0.1} className="p-panel p-5">
          <h3 className="font-display text-lg text-cream">Booking channel</h3>
          <div className="mt-5"><Donut segments={[
            { label: "Online / scheduled", value: R.channel.online, color: "#d8b25c" },
            { label: "Walk-ins", value: R.channel.walkin, color: "#7a5a24" },
          ]} links={[
            drill({ metric: "completed", dim: "service", channel: "online" }),
            drill({ metric: "completed", dim: "service", channel: "walkin" }),
          ]} /></div>
          {R.referrals.length > 0 && (
            <div className="mt-5 border-t border-white/8 pt-4">
              <div className="text-xs text-cream/45">Top referral sources</div>
              <div className="mt-2 space-y-1.5">
                {R.referrals.slice(0, 4).map((r) => <Link key={r.label} href={drill({ metric: "appointments", dim: "referral" })} className="flex justify-between text-sm hover:text-brass"><span className="text-cream/70">{r.label}</span><span className="text-cream/50">{r.count}</span></Link>)}
              </div>
            </div>
          )}
        </Reveal>
      </div>

      {/* Payment mix */}
      <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_1.4fr]">
        <Reveal className="p-panel p-5">
          <h3 className="font-display text-lg text-cream">Payment methods</h3>
          <p className="mt-1 text-xs text-cream/45">Collected revenue including tips.</p>
          <div className="mt-5"><Donut segments={R.byPayment.map((p, i) => ({ label: p.label, value: p.revenue, color: PAY_COLORS[i % PAY_COLORS.length] }))} money
            links={R.byPayment.map(() => drill({ metric: "collected", dim: "paymentMethod" }))} /></div>
        </Reveal>
        <Reveal delay={0.05} className="p-panel overflow-hidden p-0">
          <div className="p-5 pb-3"><h3 className="font-display text-lg text-cream">Payment breakdown</h3></div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-y border-white/8 text-left text-cream/45"><th className="px-5 py-2.5 font-medium">Method</th><th className="px-5 py-2.5 text-right font-medium">Transactions</th><th className="px-5 py-2.5 text-right font-medium">Collected</th><th className="px-5 py-2.5 text-right font-medium">Share</th></tr></thead>
              <tbody className="divide-y divide-white/5">
                {R.byPayment.length === 0 ? <tr><td colSpan={4} className="px-5 py-6 text-center text-cream/45">No completed payments in this period.</td></tr> :
                  R.byPayment.map((p, i) => {
                    const total = R.byPayment.reduce((s, x) => s + x.revenue, 0) || 1;
                    return (
                      <tr key={p.label}>
                        <td className="px-5 py-2.5"><Link href={drill({ metric: "collected", dim: "paymentMethod" })} className="flex items-center gap-2 hover:text-brass"><span className="h-2.5 w-2.5 rounded-full" style={{ background: PAY_COLORS[i % PAY_COLORS.length] }} />{p.label}</Link></td>
                        <td className="px-5 py-2.5 text-right text-cream/70">{p.count}</td>
                        <td className="px-5 py-2.5 text-right font-medium text-brass">{formatMoney(p.revenue)}</td>
                        <td className="px-5 py-2.5 text-right text-cream/60">{Math.round((p.revenue / total) * 100)}%</td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </Reveal>
      </div>

      {/* Peak hours heatmap */}
      <Reveal className="mt-5 p-panel p-5">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-lg text-cream">Peak booking times</h3>
          <Link href={drill({ metric: "completed", dim: "hourOfDay" })} className="text-xs text-brass hover:underline">By hour →</Link>
        </div>
        <p className="mt-1 text-xs text-cream/45">Completed appointments by day and hour.</p>
        <div className="mt-5"><Heatmap grid={R.heatmap} /></div>
      </Reveal>

      {/* Barber leaderboard */}
      <Reveal className="mt-5 p-panel overflow-hidden p-0">
        <div className="p-5 pb-3"><h3 className="font-display text-lg text-cream">Barber performance</h3></div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead><tr className="border-y border-white/8 text-left text-cream/45">
              <th className="px-5 py-2.5 font-medium">Barber</th><th className="px-5 py-2.5 text-right font-medium">Revenue</th><th className="px-5 py-2.5 font-medium">Share</th>
              <th className="px-5 py-2.5 text-right font-medium">Tips</th>
              <th className="px-5 py-2.5 text-right font-medium">Cuts</th><th className="px-5 py-2.5 text-right font-medium">Clients</th>
              <th className="px-5 py-2.5 text-right font-medium">Avg time</th><th className="px-5 py-2.5 text-right font-medium">No-shows</th><th className="px-5 py-2.5 text-right font-medium">Utilization</th>
            </tr></thead>
            <tbody className="divide-y divide-white/5">
              {R.byBarber.length === 0 ? <tr><td colSpan={9} className="px-5 py-6 text-center text-cream/45">No activity in this period.</td></tr> :
                R.byBarber.map((b, i) => (
                  <tr key={b.id}>
                    <td className="px-5 py-3"><Link href={drill({ metric: "revenue", dim: "service", barberId: b.id })} className="flex items-center gap-2 hover:text-brass"><span className="grid h-6 w-6 place-items-center rounded-full bg-brass/15 text-[10px] font-bold text-brass">{i + 1}</span>{b.name}</Link></td>
                    <td className="px-5 py-3 text-right font-semibold text-brass">{formatMoney(b.revenue)}</td>
                    <td className="w-40 px-5 py-3"><RankBar value={b.revenue} max={maxBarberRev} /></td>
                    <td className="px-5 py-3 text-right text-cream/70">{formatMoney(b.tips)}</td>
                    <td className="px-5 py-3 text-right text-cream/80">{b.appts}</td>
                    <td className="px-5 py-3 text-right text-cream/80">{b.clients}</td>
                    <td className="px-5 py-3 text-right text-cream/70">{b.avgServiceMin}m</td>
                    <td className="px-5 py-3 text-right text-cream/70">{b.noShow}</td>
                    <td className="px-5 py-3 text-right text-cream/70">{b.utilization != null ? `${Math.round(b.utilization * 100)}%` : "—"}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </Reveal>

      {/* Services + clients */}
      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <Reveal className="p-panel overflow-hidden p-0">
          <div className="p-5 pb-3"><h3 className="font-display text-lg text-cream">Service performance</h3></div>
          <div className="max-h-[360px] overflow-y-auto p-scroll">
            <table className="w-full text-sm">
              <thead><tr className="border-y border-white/8 text-left text-cream/45"><th className="px-5 py-2.5 font-medium">Service</th><th className="px-5 py-2.5 text-right font-medium">Bookings</th><th className="px-5 py-2.5 text-right font-medium">Revenue</th><th className="px-5 py-2.5 text-right font-medium">Avg</th><th className="px-5 py-2.5 text-right font-medium">Share</th></tr></thead>
              <tbody className="divide-y divide-white/5">
                {R.byService.length === 0 ? <tr><td colSpan={5} className="px-5 py-6 text-center text-cream/45">No services booked.</td></tr> :
                  R.byService.map((s) => (
                    <tr key={s.name}>
                      <td className="px-5 py-2.5 text-cream/85"><Link href={drill({ metric: "revenue", dim: "service" })} className="hover:text-brass">{s.name}</Link></td>
                      <td className="px-5 py-2.5 text-right text-cream/70">{s.count}</td>
                      <td className="px-5 py-2.5 text-right font-medium text-brass">{formatMoney(s.revenue)}</td>
                      <td className="px-5 py-2.5 text-right text-cream/60">{formatMoney(s.avgPrice)} · {s.avgDur}m</td>
                      <td className="px-5 py-2.5 text-right text-cream/60">{Math.round(s.share * 100)}%</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </Reveal>

        <div className="space-y-5">
          <Reveal className="p-panel p-5">
            <h3 className="font-display text-lg text-cream">Client analytics</h3>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <Mini label="Active clients" value={String(cur.activeClients)} />
              <Mini label="New clients" value={String(cur.newClients)} />
              <Mini label="Returning" value={String(cur.returningClients)} />
              <Mini label="Retention" value={cur.activeClients ? `${Math.round((cur.returningClients / cur.activeClients) * 100)}%` : "—"} />
            </div>
          </Reveal>
          <Reveal delay={0.05} className="p-panel p-5">
            <h3 className="font-display text-lg text-cream">Top clients</h3>
            <div className="mt-3 space-y-2">
              {R.topClients.length === 0 ? <p className="text-sm text-cream/45">No completed visits yet.</p> :
                R.topClients.map((c, i) => (
                  <div key={c.name + i} className="flex items-center gap-3 rounded-xl border border-white/8 bg-white/[0.02] p-2.5">
                    <span className="grid h-7 w-7 place-items-center rounded-full bg-brass/15 text-xs font-semibold text-brass">{i + 1}</span>
                    <span className="min-w-0 flex-1 truncate text-sm text-cream">{c.name}</span>
                    <span className="text-xs text-cream/45">{c.visits} visits</span>
                    <span className="text-sm font-semibold text-brass">{formatMoney(c.spend)}</span>
                  </div>
                ))}
            </div>
          </Reveal>
        </div>
      </div>

      {/* AI insights + YoY */}
      <div className="mt-5 grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <Reveal className="p-panel p-5">
          <div className="flex items-center gap-2"><span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-[#f4d585] to-[#b98a3c] text-[#17130a]"><Icon.spark className="h-4 w-4" /></span><h3 className="font-display text-lg text-cream">Insights</h3></div>
          <div className="mt-4 space-y-2.5">
            {R.insights.length === 0 ? <p className="text-sm text-cream/45">Not enough data yet — insights appear as your shop books more.</p> :
              R.insights.map((t, i) => (
                <div key={i} className="flex items-start gap-2.5 rounded-xl border border-white/8 bg-white/[0.02] p-3 text-sm text-cream/80">
                  <Icon.check className="mt-0.5 h-4 w-4 shrink-0 text-brass" />{t}
                </div>
              ))}
          </div>
        </Reveal>
        <Reveal delay={0.05} className="p-panel p-5">
          <h3 className="font-display text-lg text-cream">Year over year</h3>
          <p className="mt-1 text-xs text-cream/45">{range.label} vs. same period last year.</p>
          <div className="mt-4 space-y-3">
            <YoY label="Revenue" cur={formatMoney(cur.revenue)} delta={pct(cur.revenue, yoyRev)} />
            <YoY label="Tips" cur={formatMoney(cur.tips)} delta={pct(cur.tips, yoyTips)} />
            <YoY label="Completed cuts" cur={String(cur.completedCount)} delta={pct(cur.completedCount, yoyAppts)} />
          </div>
        </Reveal>
      </div>

      <p className="mt-8 text-center text-xs text-cream/30">Revenue is realized from completed appointments; tips are tracked separately. Retail, memberships, taxes and forecasting are on the roadmap.</p>
    </div>
  );
}

function Delta({ n, invert }: { n: number | null; invert?: boolean }) {
  if (n === null) return <span className="text-xs text-cream/40">no prior data</span>;
  const good = invert ? n <= 0 : n >= 0;
  if (n === 0) return <span className="text-xs text-cream/40">— no change</span>;
  return <span className={`text-xs font-medium ${good ? "text-emerald-300" : "text-red-300"}`}>{n > 0 ? "▲" : "▼"} {Math.abs(n)}% vs prev</span>;
}

function Mini({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border border-white/8 bg-white/[0.02] p-3"><div className="font-display text-xl font-semibold text-cream">{value}</div><div className="mt-0.5 text-[11px] text-cream/45">{label}</div></div>;
}

function YoY({ label, cur, delta }: { label: string; cur: string; delta: number }) {
  const up = delta >= 0;
  return (
    <div className="flex items-center justify-between rounded-xl border border-white/8 bg-white/[0.02] p-3">
      <span className="text-sm text-cream/70">{label}</span>
      <span className="flex items-center gap-2"><span className="font-semibold text-cream">{cur}</span><span className={`rounded-full px-2 py-0.5 text-xs font-medium ${up ? "bg-emerald-400/15 text-emerald-300" : "bg-red-400/15 text-red-300"}`}>{up ? "▲" : "▼"} {Math.abs(delta)}%</span></span>
    </div>
  );
}
