import { NextResponse } from "next/server";
import { requireStaffWithPerms } from "@/lib/rbac";
import { can } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { resolveRange } from "@/lib/reportRange";
import { buildReport, type ApptRow } from "@/lib/reportData";

const money = (c: number) => (c / 100).toFixed(2);
const esc = (v: string | number) => { const s = String(v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };

export async function GET(req: Request) {
  const user = await requireStaffWithPerms();
  if (!can(user, "shop.viewAll")) return new NextResponse("Forbidden", { status: 403 });
  const tenantId = user.tenantId;
  const url = new URL(req.url);
  const range = resolveRange(url.searchParams.get("preset") ?? "last30", new Date(), url.searchParams.get("from") ?? undefined, url.searchParams.get("to") ?? undefined);

  const [apptRows, clients, times] = await Promise.all([
    prisma.appointment.findMany({
      where: { tenantId, active: true, startTime: { gte: range.prevFrom, lte: range.to } },
      select: { startTime: true, startedAt: true, finishedAt: true, collectedCents: true, tipCents: true, paymentMethod: true, status: true, kind: true, referral: true, clientId: true, client: { select: { name: true } }, barberId: true, barber: { select: { name: true } }, service: { select: { name: true, priceCents: true, durationMin: true } } },
      orderBy: { startTime: "asc" },
    }),
    prisma.client.findMany({ where: { tenantId }, select: { id: true, createdAt: true }, take: 20000 }),
    prisma.timeEntry.findMany({ where: { tenantId, clockIn: { gte: range.prevFrom, lte: range.to } }, select: { userId: true, clockIn: true, clockOut: true } }),
  ]);
  const appts: ApptRow[] = apptRows.map((a) => ({
    startTime: a.startTime, startedAt: a.startedAt, finishedAt: a.finishedAt, collectedCents: a.collectedCents,
    tipCents: a.tipCents, paymentMethod: a.paymentMethod,
    status: a.status, kind: a.kind, referral: a.referral, clientId: a.clientId, clientName: a.client.name,
    barberId: a.barberId, barberName: a.barber.name, serviceName: a.service.name, servicePriceCents: a.service.priceCents, serviceDurationMin: a.service.durationMin,
  }));
  const R = buildReport(appts, clients, times, range);
  const { cur } = R;

  const rows: string[] = [];
  const line = (...cells: (string | number)[]) => rows.push(cells.map(esc).join(","));

  line(`The Chair — Report`, range.label);
  line("");
  line("Metric", "Value");
  line("Revenue ($)", money(cur.revenue));
  line("Tips ($)", money(cur.tips));
  line("Appointments", cur.apptCount);
  line("Completed", cur.completedCount);
  line("Cancelled", cur.cancelled);
  line("No-shows", cur.noShow);
  line("Avg ticket ($)", money(cur.avgTicket));
  line("Avg service time (min)", cur.avgServiceMin);
  line("No-show rate (%)", Math.round(cur.noShowRate * 100));
  line("Active clients", cur.activeClients);
  line("New clients", cur.newClients);
  line("Returning clients", cur.returningClients);
  line("Utilization (%)", cur.utilization != null ? Math.round(cur.utilization * 100) : "");
  line("");
  line("Revenue by period");
  line("Period", "Revenue ($)");
  for (const s of R.revenueSeries) line(s.label, money(s.value));
  line("");
  line("By barber");
  line("Barber", "Revenue ($)", "Tips ($)", "Cuts", "Clients", "Avg time (min)", "No-shows", "Utilization (%)");
  for (const b of R.byBarber) line(b.name, money(b.revenue), money(b.tips), b.appts, b.clients, b.avgServiceMin, b.noShow, b.utilization != null ? Math.round(b.utilization * 100) : "");
  line("");
  line("By service");
  line("Service", "Bookings", "Revenue ($)", "Avg price ($)", "Avg duration (min)", "Share (%)");
  for (const s of R.byService) line(s.name, s.count, money(s.revenue), money(s.avgPrice), s.avgDur, Math.round(s.share * 100));
  line("");
  line("By payment method");
  line("Method", "Transactions", "Collected ($)");
  for (const p of R.byPayment) line(p.label, p.count, money(p.revenue));

  return new NextResponse(rows.join("\n"), {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="chair-report-${range.preset}.csv"` },
  });
}
