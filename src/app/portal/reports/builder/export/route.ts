import { NextResponse } from "next/server";
import { requireStaffWithPerms } from "@/lib/rbac";
import { can } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { resolveRange } from "@/lib/reportRange";
import type { ApptRow } from "@/lib/reportData";
import { buildCustomReport, metricValue, dimensionLabel, BUILDER_METRICS, isMetric, isDimension, type MetricKey, type DimensionKey } from "@/lib/reportBuilder";

const money = (c: number) => (c / 100).toFixed(2);
const esc = (v: string | number) => { const s = String(v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };

export async function GET(req: Request) {
  const user = await requireStaffWithPerms();
  if (!can(user, "shop.viewAll")) return new NextResponse("Forbidden", { status: 403 });
  const tenantId = user.tenantId;
  const url = new URL(req.url);
  const g = (k: string) => url.searchParams.get(k) ?? "";

  const metric: MetricKey = isMetric(g("metric")) ? (g("metric") as MetricKey) : "revenue";
  const dim: DimensionKey = isDimension(g("dim")) ? (g("dim") as DimensionKey) : "barber";
  const range = resolveRange(g("preset") || "last30", new Date(), g("from") || undefined, g("to") || undefined);
  const statusFilter = ["COMPLETED", "CONFIRMED", "CANCELLED", "NO_SHOW"].includes(g("status")) ? g("status") : undefined;
  const channel = g("channel");

  const where: Prisma.AppointmentWhereInput = {
    tenantId, active: true, startTime: { gte: range.from, lte: range.to },
    ...(g("barberId") ? { barberId: g("barberId") } : {}),
    ...(g("serviceId") ? { serviceId: g("serviceId") } : {}),
    ...(statusFilter ? { status: statusFilter as Prisma.AppointmentWhereInput["status"] } : {}),
    ...(channel === "walkin" ? { kind: "WALKIN" } : channel === "online" ? { kind: { not: "WALKIN" } } : {}),
  };

  const found = await prisma.appointment.findMany({
    where,
    select: { startTime: true, startedAt: true, finishedAt: true, collectedCents: true, tipCents: true, paymentMethod: true, status: true, kind: true, referral: true, clientId: true, client: { select: { name: true } }, barberId: true, barber: { select: { name: true } }, service: { select: { name: true, priceCents: true, durationMin: true } } },
    orderBy: { startTime: "asc" }, take: 50000,
  });
  const appts: ApptRow[] = found.map((a) => ({
    startTime: a.startTime, startedAt: a.startedAt, finishedAt: a.finishedAt, collectedCents: a.collectedCents,
    tipCents: a.tipCents, paymentMethod: a.paymentMethod,
    status: a.status, kind: a.kind, referral: a.referral, clientId: a.clientId, clientName: a.client.name,
    barberId: a.barberId, barberName: a.barber.name, serviceName: a.service.name, servicePriceCents: a.service.priceCents, serviceDurationMin: a.service.durationMin,
  }));

  const report = buildCustomReport(appts, dim, metric);
  const rowsOut: string[] = [];
  const line = (...cells: (string | number)[]) => rowsOut.push(cells.map(esc).join(","));

  line("The Chair — Custom Report", `${dimensionLabel(dim)} · ${range.label}`);
  line("");
  line(dimensionLabel(dim), ...BUILDER_METRICS.map((m) => m.kind === "money" ? `${m.label} ($)` : m.label));
  for (const r of report.rows) line(r.label, ...BUILDER_METRICS.map((m) => { const v = metricValue(r, m.key); return m.kind === "money" ? money(v) : v; }));
  line("Total", ...BUILDER_METRICS.map((m) => { const v = metricValue(report.totals, m.key); return m.kind === "money" ? money(v) : v; }));

  return new NextResponse(rowsOut.join("\n"), {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="chair-custom-${dim}-${metric}.csv"` },
  });
}
