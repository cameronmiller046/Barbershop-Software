import { requirePlatformAdmin } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { formatMoney } from "@/lib/utils";
import { monthlyBuckets } from "@/lib/reporting";
import { BarChart } from "@/components/charts/BarChart";
import { Breakdown, type BreakdownRow } from "@/components/charts/Breakdown";
import { subDays, subMonths, startOfMonth, eachDayOfInterval, format } from "date-fns";

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

  const [
    totalShops, activeShops, staffCount, pendingApps, appsTotal, appsApproved,
    completed, recentAppts, pv30,
  ] = await Promise.all([
    prisma.tenant.count(),
    prisma.tenant.count({ where: { status: "ACTIVE" } }),
    prisma.user.count({ where: { role: { in: ["OWNER", "BARBER", "RECEPTIONIST"] } } }),
    prisma.betaApplication.count({ where: { status: "PENDING" } }),
    prisma.betaApplication.count(),
    prisma.betaApplication.count({ where: { status: "APPROVED" } }),
    prisma.appointment.findMany({
      where: { status: "COMPLETED", startTime: { gte: startOfMonth(subMonths(now, 11)) } },
      select: { startTime: true, service: { select: { priceCents: true } } },
    }),
    prisma.appointment.findMany({
      where: { startTime: { gte: since30, lte: now } },
      select: { startTime: true },
    }),
    prisma.pageView.findMany({
      where: { createdAt: { gte: since30 } },
      select: { createdAt: true, page: true, source: true, device: true, visitorHash: true, tenantId: true },
    }),
  ]);

  // ── Business ──
  const completedRev = completed.map((a) => ({ startTime: a.startTime, priceCents: a.service.priceCents }));
  const revBuckets = monthlyBuckets(completedRev, now, 12);
  const revenue30 = completedRev.filter((a) => a.startTime >= since30).reduce((s, a) => s + a.priceCents, 0);

  const bizDays = eachDayOfInterval({ start: since30, end: now });
  const bookingByDay = tally(recentAppts, (a) => format(a.startTime, "yyyy-MM-dd"));
  const bookingBars = bizDays.map((d) => ({ label: format(d, "d"), value: bookingByDay.get(format(d, "yyyy-MM-dd")) ?? 0 }));

  const conversion = appsTotal > 0 ? Math.round((activeShops / appsTotal) * 100) : 0;

  const bizStats = [
    { label: "Total shops", value: String(totalShops) },
    { label: "Active shops", value: String(activeShops) },
    { label: "Staff accounts", value: String(staffCount) },
    { label: "Bookings (30d)", value: String(recentAppts.length) },
    { label: "Revenue (30d)", value: formatMoney(revenue30) },
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
