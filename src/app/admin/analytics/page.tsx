import { requirePlatformAdmin } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { formatMoney } from "@/lib/utils";
import { monthlyBuckets } from "@/lib/reporting";
import { BarChart } from "@/components/charts/BarChart";
import { Breakdown, type BreakdownRow } from "@/components/charts/Breakdown";
import { KIND_LABEL } from "@/lib/appointmentMeta";
const DEMO_ACCOUNT_EMAILS: string[] = [];
import { subDays, subMonths, startOfMonth, eachDayOfInterval, format } from "date-fns";

// Demo showcase logins (test1/test2) must never skew real platform metrics.
const notDemoBarber = { barber: { email: { notIn: DEMO_ACCOUNT_EMAILS } } };

export const dynamic = "force-dynamic";

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function tally<T>(rows: T[], key: (t: T) => string | null | undefined): Map<string, number> {
  const m = new Map<string, number>();
  for (const r of rows) {
    const k = key(r) ?? "—";
    m.set(k, (m.get(k) ?? 0) + 1);
  }
  return m;
}
function topRows(m: Map<string, number>, n = 6): BreakdownRow[] {
  return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, n).map(([label, value]) => ({ label, value }));
}

export default async function AnalyticsPage() {
  await requirePlatformAdmin();

  const now = new Date();
  const since30 = subDays(now, 30);
  const since7 = subDays(now, 7);
  const since90 = subDays(now, 90);

  const [
    totalShops, activeShops, staffCount, pendingApps, appsTotal, appsApproved,
    completed, recent, clientsTotal, clientsNew30, pv30,
  ] = await Promise.all([
    prisma.tenant.count(),
    prisma.tenant.count({ where: { status: "ACTIVE" } }),
    prisma.user.count({ where: { role: { in: ["OWNER", "BARBER", "RECEPTIONIST"] }, email: { notIn: DEMO_ACCOUNT_EMAILS } } }),
    prisma.betaApplication.count({ where: { status: "PENDING" } }),
    prisma.betaApplication.count(),
    prisma.betaApplication.count({ where: { status: "APPROVED" } }),
    prisma.appointment.findMany({
      where: { active: true, status: "COMPLETED", startTime: { gte: startOfMonth(subMonths(now, 11)) }, ...notDemoBarber },
      select: { startTime: true, service: { select: { priceCents: true } } },
    }),
    // Rich 90-day window powers the operations reports (outcomes, barber
    // leaderboard, top services, turnaround, busy times).
    prisma.appointment.findMany({
      where: { active: true, startTime: { gte: since90, lte: now }, ...notDemoBarber },
      select: {
        status: true, startTime: true, startedAt: true, finishedAt: true,
        collectedCents: true, kind: true, referral: true,
        service: { select: { name: true, priceCents: true } },
        barber: { select: { id: true, name: true, role: true } },
        tenant: { select: { name: true } },
      },
    }),
    prisma.client.count(),
    prisma.client.count({ where: { createdAt: { gte: since30 } } }),
    prisma.pageView.findMany({
      where: { createdAt: { gte: since30 } },
      select: { createdAt: true, page: true, source: true, device: true, visitorHash: true, tenantId: true },
    }),
  ]);

  // ── Business ──
  const completedRev = completed.map((a) => ({ startTime: a.startTime, priceCents: a.service.priceCents }));
  const revBuckets = monthlyBuckets(completedRev, now, 12);

  const recent30 = recent.filter((a) => a.startTime >= since30);
  const rev = (a: { collectedCents: number | null; service: { priceCents: number } }) => a.collectedCents ?? a.service.priceCents;
  const revenue30 = recent30.filter((a) => a.status === "COMPLETED").reduce((s, a) => s + rev(a), 0);

  const bizDays = eachDayOfInterval({ start: since30, end: now });
  const bookingByDay = tally(recent30, (a) => format(a.startTime, "yyyy-MM-dd"));
  const bookingBars = bizDays.map((d) => ({ label: format(d, "d"), value: bookingByDay.get(format(d, "yyyy-MM-dd")) ?? 0 }));

  const conversion = appsTotal > 0 ? Math.round((activeShops / appsTotal) * 100) : 0;

  const bizStats = [
    { label: "Total shops", value: String(totalShops) },
    { label: "Active shops", value: String(activeShops) },
    { label: "Staff accounts", value: String(staffCount) },
    { label: "Bookings (30d)", value: String(recent30.length) },
    { label: "Revenue (30d)", value: formatMoney(revenue30) },
  ];

  // ── Operations (90 days) ──
  const rc = recent.filter((a) => a.status === "COMPLETED");
  const outcomes = tally(recent, (a) => a.status);
  const doneN = outcomes.get("COMPLETED") ?? 0;
  const cancelledN = outcomes.get("CANCELLED") ?? 0;
  const noShowN = outcomes.get("NO_SHOW") ?? 0;
  const decided = doneN + cancelledN + noShowN;
  const noShowRate = decided ? Math.round((noShowN / decided) * 100) : 0;

  // Most profitable barbers — by what they actually collected. Only real barbers
  // count here: owners/admins are never treated as barbers, even if a shop
  // assigned them appointments.
  const barberMap = new Map<string, { name: string; shop: string; revenue: number; cuts: number }>();
  for (const a of rc) {
    if (a.barber.role !== "BARBER") continue;
    const row = barberMap.get(a.barber.id) ?? { name: a.barber.name, shop: a.tenant.name, revenue: 0, cuts: 0 };
    row.revenue += rev(a); row.cuts += 1;
    barberMap.set(a.barber.id, row);
  }
  const leaderboard = [...barberMap.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 8);

  // Top services by revenue.
  const svcMap = new Map<string, number>();
  for (const a of rc) svcMap.set(a.service.name, (svcMap.get(a.service.name) ?? 0) + rev(a));
  const topServices = [...svcMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([label, value]) => ({ label, value }));

  // Turnaround (checked-in cuts).
  const timed = rc.filter((a) => a.startedAt && a.finishedAt);
  const avgTurnaround = timed.length
    ? Math.round(timed.reduce((s, a) => s + (a.finishedAt!.getTime() - a.startedAt!.getTime()) / 60000, 0) / timed.length)
    : null;

  // Walk-in vs appointment + referral sources.
  const kindRows = topRows(tally(rc, (a) => a.kind)).map((r) => ({ label: KIND_LABEL[r.label] ?? r.label, value: r.value }));
  const referralRows = topRows(tally(rc.filter((a) => a.referral), (a) => a.referral));

  // Busiest times.
  const WD = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const byWeekday = new Array(7).fill(0);
  const byHour = new Array(24).fill(0);
  for (const a of recent) { byWeekday[a.startTime.getDay()]++; byHour[a.startTime.getHours()]++; }
  const weekdayBars = WD.map((label, i) => ({ label, value: byWeekday[i] }));
  const hourBars = Array.from({ length: 15 }, (_, i) => i + 7).map((h) => ({ label: `${h % 12 === 0 ? 12 : h % 12}${h < 12 ? "a" : "p"}`, value: byHour[h] }));

  const opsStats = [
    { label: "Completed (90d)", value: doneN.toLocaleString() },
    { label: "Cancelled", value: cancelledN.toLocaleString() },
    { label: "No-shows", value: noShowN.toLocaleString() },
    { label: "No-show rate", value: `${noShowRate}%` },
    { label: "Avg turnaround", value: avgTurnaround != null ? `${avgTurnaround} min` : "—" },
  ];

  // ── Traffic ──
  const pv7 = pv30.filter((p) => p.createdAt >= since7);
  const visitors30 = new Set(pv30.map((p) => p.visitorHash)).size;
  const visitors7 = new Set(pv7.map((p) => p.visitorHash)).size;
  const viewsPerVisitor = visitors30 > 0 ? (pv30.length / visitors30).toFixed(1) : "0";

  const trafficByDay = tally(pv30, (p) => format(p.createdAt, "yyyy-MM-dd"));
  const trafficBars = bizDays.map((d) => ({ label: format(d, "d"), value: trafficByDay.get(format(d, "yyyy-MM-dd")) ?? 0 }));

  const sources = topRows(tally(pv30, (p) => p.source)).map((r) => ({ ...r, label: cap(r.label) }));
  const devices = topRows(tally(pv30, (p) => p.device)).map((r) => ({ ...r, label: cap(r.label) }));
  const pages = topRows(tally(pv30, (p) => p.page)).map((r) => ({ ...r, label: cap(r.label) }));

  // Top shops by views — map tenantId → name (a business, not personal data).
  const shopTally = tally(pv30, (p) => p.tenantId);
  const shopIds = [...shopTally.keys()].filter((k) => k !== "—");
  const shopNames = await prisma.tenant.findMany({ where: { id: { in: shopIds } }, select: { id: true, name: true } });
  const nameById = new Map(shopNames.map((t) => [t.id, t.name]));
  const topShops = topRows(shopTally).map((r) => ({
    label: r.label === "—" ? "Marketing / other" : nameById.get(r.label) ?? "Unknown shop",
    value: r.value,
  }));

  const trafficStats = [
    { label: "Visitors (7d)", value: visitors7.toLocaleString() },
    { label: "Pageviews (7d)", value: pv7.length.toLocaleString() },
    { label: "Visitors (30d)", value: visitors30.toLocaleString() },
    { label: "Pageviews (30d)", value: pv30.length.toLocaleString() },
    { label: "Views / visitor", value: viewsPerVisitor },
  ];

  const hasTraffic = pv30.length > 0;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl">Analytics</h1>
        <p className="mt-1 text-cream/60">Platform health and anonymous traffic — for the team to monitor.</p>
        <p className="mt-2 inline-block rounded-full border border-white/10 px-3 py-1 text-xs text-cream/50">
          🔒 Privacy-first: cookieless, no IPs stored, visitors anonymized with a daily-rotating hash. No customer names, emails, or phone numbers appear here.
        </p>
      </div>

      {/* ───────── Business ───────── */}
      <section className="space-y-4">
        <h2 className="font-display text-2xl">Business</h2>
        <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {bizStats.map((s) => (
            <div key={s.label} className="stat">
              <div className="text-2xl font-bold text-brass">{s.value}</div>
              <div className="mt-1 text-xs text-cream/50">{s.label}</div>
            </div>
          ))}
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <div className="card lg:col-span-2">
            <h3 className="font-display text-lg">Platform revenue — last 12 months</h3>
            <p className="mt-1 text-xs text-cream/50">Realized revenue across all shops.</p>
            <div className="mt-4">
              <BarChart bars={revBuckets.map((b) => ({ label: b.label, value: b.revenueCents, highlight: b.isCurrent }))} format={formatMoney} />
            </div>
          </div>
          <div className="card">
            <h3 className="font-display text-lg">Onboarding funnel</h3>
            <p className="mt-1 text-xs text-cream/50">Applications → live shops.</p>
            <div className="mt-4">
              <Breakdown rows={[
                { label: "Applied", value: appsTotal },
                { label: "Approved", value: appsApproved },
                { label: "Active shops", value: activeShops },
              ]} />
            </div>
            <p className="mt-4 text-sm text-cream/60">
              Applied → active conversion: <span className="font-semibold text-brass">{conversion}%</span>
              {pendingApps > 0 && <> · {pendingApps} awaiting review</>}
            </p>
          </div>
        </div>

        <div className="card">
          <h3 className="font-display text-lg">Bookings per day (30d)</h3>
          <div className="mt-4">
            <BarChart bars={bookingBars} format={(n) => String(n)} height={160} />
          </div>
        </div>
      </section>

      {/* ───────── Operations (90 days) ───────── */}
      <section className="space-y-4">
        <h2 className="font-display text-2xl">Shop operations <span className="text-sm font-normal text-cream/40">· last 90 days</span></h2>
        <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {opsStats.map((s) => (
            <div key={s.label} className="stat">
              <div className="text-2xl font-bold text-brass">{s.value}</div>
              <div className="mt-1 text-xs text-cream/50">{s.label}</div>
            </div>
          ))}
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          {/* Most profitable barbers */}
          <div className="card overflow-hidden p-0">
            <div className="p-5 pb-3"><h3 className="font-display text-lg">💈 Most profitable barbers</h3><p className="mt-1 text-xs text-cream/50">By amount collected.</p></div>
            {leaderboard.length === 0 ? (
              <div className="px-5 pb-5 text-cream/60">No completed cuts yet.</div>
            ) : (
              <table className="w-full text-sm">
                <thead className="text-left text-cream/50"><tr className="border-y border-white/10">
                  <th className="px-5 py-2.5 font-medium">Barber</th><th className="px-5 py-2.5 text-right font-medium">Cuts</th><th className="px-5 py-2.5 text-right font-medium">Collected</th>
                </tr></thead>
                <tbody className="divide-y divide-white/5">
                  {leaderboard.map((b, i) => (
                    <tr key={i}>
                      <td className="px-5 py-2.5">{i === 0 ? "🏆 " : ""}{b.name}<span className="ml-2 text-xs text-cream/40">{b.shop}</span></td>
                      <td className="px-5 py-2.5 text-right text-cream/70">{b.cuts}</td>
                      <td className="px-5 py-2.5 text-right text-brass">{formatMoney(b.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="card">
            <h3 className="font-display text-lg">Top services</h3>
            <p className="mt-1 text-xs text-cream/50">By revenue collected.</p>
            <div className="mt-4"><Breakdown rows={topServices} format={formatMoney} /></div>
          </div>

          <div className="card">
            <h3 className="font-display text-lg">Walk-in vs appointment</h3>
            <div className="mt-4"><Breakdown rows={kindRows} /></div>
          </div>

          <div className="card">
            <h3 className="font-display text-lg">Referral sources</h3>
            <p className="mt-1 text-xs text-cream/50">How clients found the shop.</p>
            <div className="mt-4"><Breakdown rows={referralRows} emptyLabel="No referrals logged yet." /></div>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="card">
            <h3 className="font-display text-lg">Busiest days</h3>
            <div className="mt-4"><BarChart bars={weekdayBars} format={(n) => String(n)} height={150} /></div>
          </div>
          <div className="card">
            <h3 className="font-display text-lg">Busiest hours</h3>
            <div className="mt-4"><BarChart bars={hourBars} format={(n) => String(n)} height={150} /></div>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="stat"><div className="text-2xl font-bold text-brass">{clientsTotal.toLocaleString()}</div><div className="mt-1 text-xs text-cream/50">Total clients</div></div>
          <div className="stat"><div className="text-2xl font-bold text-brass">{clientsNew30.toLocaleString()}</div><div className="mt-1 text-xs text-cream/50">New clients (30d)</div></div>
          <div className="stat"><div className="text-2xl font-bold text-brass">{timed.length.toLocaleString()}</div><div className="mt-1 text-xs text-cream/50">Timed cuts (turnaround)</div></div>
        </div>
      </section>

      {/* ───────── Traffic ───────── */}
      <section className="space-y-4">
        <h2 className="font-display text-2xl">Traffic <span className="text-sm font-normal text-cream/40">· anonymous</span></h2>

        {!hasTraffic ? (
          <div className="card text-cream/60">
            No visits recorded yet. Once visitors browse the public shop sites
            (<span className="text-brass">/t/&lt;shop&gt;</span>), anonymous counts appear here.
          </div>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-5">
              {trafficStats.map((s) => (
                <div key={s.label} className="stat">
                  <div className="text-2xl font-bold text-brass">{s.value}</div>
                  <div className="mt-1 text-xs text-cream/50">{s.label}</div>
                </div>
              ))}
            </div>

            <div className="card">
              <h3 className="font-display text-lg">Pageviews per day (30d)</h3>
              <div className="mt-4">
                <BarChart bars={trafficBars} format={(n) => String(n)} height={160} />
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <div className="card">
                <h3 className="font-display text-lg">Top shops</h3>
                <p className="mt-1 text-xs text-cream/50">Most-visited public sites.</p>
                <div className="mt-4"><Breakdown rows={topShops} /></div>
              </div>
              <div className="card">
                <h3 className="font-display text-lg">Top pages</h3>
                <p className="mt-1 text-xs text-cream/50">Where visitors land.</p>
                <div className="mt-4"><Breakdown rows={pages} /></div>
              </div>
              <div className="card">
                <h3 className="font-display text-lg">Sources</h3>
                <p className="mt-1 text-xs text-cream/50">How they got there.</p>
                <div className="mt-4"><Breakdown rows={sources} /></div>
              </div>
              <div className="card">
                <h3 className="font-display text-lg">Devices</h3>
                <div className="mt-4"><Breakdown rows={devices} /></div>
              </div>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
