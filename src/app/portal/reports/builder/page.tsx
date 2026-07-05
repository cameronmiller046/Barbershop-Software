import { redirect } from "next/navigation";
import Link from "next/link";
import { requireStaffWithPerms } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { can } from "@/lib/permissions";
import { planLimits } from "@/lib/plans";
import { formatMoney } from "@/lib/utils";
import { resolveRange } from "@/lib/reportRange";
import type { ApptRow } from "@/lib/reportData";
import {
  buildCustomReport, metricValue, metricMeta, dimensionLabel,
  BUILDER_METRICS, isMetric, isDimension, type MetricKey, type DimensionKey,
} from "@/lib/reportBuilder";
import { ReportBuilderControls } from "@/components/reports/ReportBuilderControls";
import { Bars } from "@/components/reports/charts";
import { Reveal } from "@/components/home/motion";
import { Icon } from "@/components/home/icons";

export const dynamic = "force-dynamic";

type SP = { metric?: string; dim?: string; preset?: string; from?: string; to?: string; barberId?: string; serviceId?: string; status?: string; channel?: string };

export default async function ReportBuilderPage({ searchParams }: { searchParams: Promise<SP> }) {
  const user = await requireStaffWithPerms();
  if (!can(user, "shop.viewAll")) redirect("/portal");
  const tenantId = user.tenantId;
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { plan: true } });
  if (!planLimits(tenant?.plan ?? "SOLO").reports) redirect("/portal?upgrade=reports");

  const sp = await searchParams;
  const metric: MetricKey = isMetric(sp.metric ?? "") ? (sp.metric as MetricKey) : "revenue";
  const dim: DimensionKey = isDimension(sp.dim ?? "") ? (sp.dim as DimensionKey) : "barber";
  const range = resolveRange(sp.preset ?? "last30", new Date(), sp.from, sp.to);

  const statusFilter = ["COMPLETED", "CONFIRMED", "CANCELLED", "NO_SHOW"].includes(sp.status ?? "") ? sp.status : undefined;
  const channel = sp.channel === "walkin" || sp.channel === "online" ? sp.channel : undefined;

  const where: Prisma.AppointmentWhereInput = {
    tenantId, active: true, startTime: { gte: range.from, lte: range.to },
    ...(sp.barberId ? { barberId: sp.barberId } : {}),
    ...(sp.serviceId ? { serviceId: sp.serviceId } : {}),
    ...(statusFilter ? { status: statusFilter as Prisma.AppointmentWhereInput["status"] } : {}),
    ...(channel === "walkin" ? { kind: "WALKIN" } : channel === "online" ? { kind: { not: "WALKIN" } } : {}),
  };

  const [rows, barbers, services] = await Promise.all([
    prisma.appointment.findMany({
      where,
      select: { startTime: true, startedAt: true, finishedAt: true, collectedCents: true, tipCents: true, paymentMethod: true, status: true, kind: true, referral: true, clientId: true, client: { select: { name: true } }, barberId: true, barber: { select: { name: true } }, service: { select: { name: true, priceCents: true, durationMin: true } } },
      orderBy: { startTime: "asc" }, take: 50000,
    }),
    prisma.user.findMany({ where: { tenantId, role: "BARBER" }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.service.findMany({ where: { tenantId }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);

  const appts: ApptRow[] = rows.map((a) => ({
    startTime: a.startTime, startedAt: a.startedAt, finishedAt: a.finishedAt, collectedCents: a.collectedCents,
    tipCents: a.tipCents, paymentMethod: a.paymentMethod,
    status: a.status, kind: a.kind, referral: a.referral, clientId: a.clientId, clientName: a.client.name,
    barberId: a.barberId, barberName: a.barber.name, serviceName: a.service.name, servicePriceCents: a.service.priceCents, serviceDurationMin: a.service.durationMin,
  }));

  const report = buildCustomReport(appts, dim, metric);
  const meta = metricMeta(metric);
  const fmt = (v: number) => (meta.kind === "money" ? formatMoney(v) : v.toLocaleString());
  const headline = metricValue(report.totals, metric);

  const cfg = {
    metric, dim, preset: range.preset, from: sp.from ?? "", to: sp.to ?? "",
    barberId: sp.barberId ?? "", serviceId: sp.serviceId ?? "", status: sp.status ?? "", channel: sp.channel ?? "",
  };
  const exportQs = new URLSearchParams(Object.entries(cfg).filter(([, v]) => v)).toString();

  return (
    <div className="mx-auto max-w-[1500px]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href="/portal/reports" className="text-sm text-cream/50 hover:text-brass">← Reports &amp; Analytics</Link>
          <h1 className="mt-1 font-display text-2xl text-cream sm:text-3xl">Custom Report</h1>
          <p className="mt-1 text-cream/55">{meta.label} by {dimensionLabel(dim)} · {range.label}</p>
        </div>
        <a href={`/portal/reports/builder/export?${exportQs}`} className="p-btn-ghost"><Icon.arrow className="h-4 w-4" /> Export CSV</a>
      </div>

      <div className="mt-5"><ReportBuilderControls cfg={cfg} barbers={barbers.map((b) => ({ value: b.id, label: b.name }))} services={services.map((s) => ({ value: s.id, label: s.name }))} /></div>

      {/* Headline + chart */}
      <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_1.6fr]">
        <Reveal className="p-panel p-5">
          <div className="text-xs text-cream/50">{meta.label} · total</div>
          <div className="mt-1 font-display text-4xl font-semibold text-brass">{fmt(headline)}</div>
          <div className="mt-4 space-y-1.5 border-t border-white/8 pt-4 text-sm">
            <Stat label="Groups" value={String(report.rows.length)} />
            <Stat label="Completed cuts" value={report.totals.completed.toLocaleString()} />
            <Stat label="Appointments" value={report.totals.appointments.toLocaleString()} />
            <Stat label="Unique clients" value={report.totals.clients.toLocaleString()} />
          </div>
        </Reveal>
        <Reveal delay={0.05} className="p-panel p-5">
          <h3 className="font-display text-lg text-cream">{meta.label} by {dimensionLabel(dim)}</h3>
          <div className="mt-5">
            {report.rows.length === 0
              ? <p className="text-sm text-cream/45">No data for this selection.</p>
              : <Bars items={report.rows.slice(0, 16).map((r) => ({ label: r.label, value: metricValue(r, metric) }))} money={meta.kind === "money"} height={200} />}
          </div>
        </Reveal>
      </div>

      {/* Full table */}
      <Reveal className="mt-5 p-panel overflow-hidden p-0">
        <div className="p-5 pb-3"><h3 className="font-display text-lg text-cream">Breakdown by {dimensionLabel(dim)}</h3></div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-sm">
            <thead><tr className="border-y border-white/8 text-left text-cream/45">
              <th className="px-5 py-2.5 font-medium">{dimensionLabel(dim)}</th>
              {BUILDER_METRICS.map((m) => (
                <th key={m.key} className={`px-5 py-2.5 text-right font-medium ${m.key === metric ? "text-brass" : ""}`}>{m.label}</th>
              ))}
            </tr></thead>
            <tbody className="divide-y divide-white/5">
              {report.rows.length === 0 ? (
                <tr><td colSpan={BUILDER_METRICS.length + 1} className="px-5 py-6 text-center text-cream/45">No data for this selection.</td></tr>
              ) : (
                report.rows.map((r) => (
                  <tr key={r.key} className="hover:bg-white/[0.02]">
                    <td className="px-5 py-2.5 text-cream/90">{r.label}</td>
                    {BUILDER_METRICS.map((m) => {
                      const v = metricValue(r, m.key);
                      const text = m.kind === "money" ? formatMoney(v) : v.toLocaleString();
                      return <td key={m.key} className={`px-5 py-2.5 text-right ${m.key === metric ? "font-semibold text-brass" : "text-cream/70"}`}>{text}</td>;
                    })}
                  </tr>
                ))
              )}
            </tbody>
            {report.rows.length > 0 && (
              <tfoot><tr className="border-t border-white/10 font-semibold">
                <td className="px-5 py-3 text-cream">Total</td>
                {BUILDER_METRICS.map((m) => {
                  const v = metricValue(report.totals, m.key);
                  const text = m.kind === "money" ? formatMoney(v) : v.toLocaleString();
                  return <td key={m.key} className={`px-5 py-3 text-right ${m.key === metric ? "text-brass" : "text-cream/80"}`}>{text}</td>;
                })}
              </tr></tfoot>
            )}
          </table>
        </div>
      </Reveal>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return <div className="flex justify-between"><span className="text-cream/50">{label}</span><span className="text-cream/85">{value}</span></div>;
}
