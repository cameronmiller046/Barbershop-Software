import { redirect } from "next/navigation";
import { requireStaffWithPerms } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { formatMoney } from "@/lib/utils";
import { can } from "@/lib/permissions";
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, addDays } from "date-fns";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  const user = await requireStaffWithPerms();
  // Whole-shop reporting is a Manager capability; Barbers don't see it.
  if (!can(user, "shop.viewAll")) redirect("/portal");
  const tenantId = user.tenantId;

  const now = new Date();
  const weekEnd = endOfWeek(now);
  const next30 = addDays(now, 30);

  // Projected earnings = the value of confirmed bookings still to come.
  const upcoming = await prisma.appointment.findMany({
    where: { tenantId, status: "CONFIRMED", startTime: { gte: now } },
    include: { service: true, barber: true, client: true },
    orderBy: { startTime: "asc" },
  });
  // Realized earnings = completed appointments this month, for context.
  const completedThisMonth = await prisma.appointment.findMany({
    where: { tenantId, status: "COMPLETED", startTime: { gte: startOfMonth(now), lte: endOfMonth(now) } },
    include: { service: true },
  });

  const value = (a: { service: { priceCents: number } }) => a.service.priceCents;
  const sum = (xs: { service: { priceCents: number } }[]) => xs.reduce((t, a) => t + value(a), 0);

  const projectedTotal = sum(upcoming);
  const projectedThisWeek = sum(upcoming.filter((a) => a.startTime <= weekEnd));
  const projectedNext30 = sum(upcoming.filter((a) => a.startTime <= next30));
  const realizedThisMonth = sum(completedThisMonth);

  // Projected earnings broken down per barber (the whole-shop view).
  const byBarber = new Map<string, { name: string; count: number; cents: number }>();
  for (const a of upcoming) {
    const key = a.barberId;
    const row = byBarber.get(key) ?? { name: a.barber.name, count: 0, cents: 0 };
    row.count += 1;
    row.cents += value(a);
    byBarber.set(key, row);
  }
  const barberRows = [...byBarber.values()].sort((a, b) => b.cents - a.cents);

  const stats = [
    { label: "Projected — next 30 days", value: formatMoney(projectedNext30) },
    { label: "Projected — this week", value: formatMoney(projectedThisWeek) },
    { label: "Projected — all upcoming", value: formatMoney(projectedTotal) },
    { label: "Earned this month", value: formatMoney(realizedThisMonth) },
  ];

  return (
    <div>
      <h1 className="font-display text-3xl">Reports</h1>
      <p className="mt-1 text-cream/60">
        Projected earnings from confirmed bookings still on the calendar.
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="stat">
            <div className="text-2xl font-bold text-brass">{s.value}</div>
            <div className="mt-1 text-xs text-cream/50">{s.label}</div>
          </div>
        ))}
      </div>

      <h2 className="mt-10 font-display text-2xl">Projected earnings by barber</h2>
      {barberRows.length === 0 ? (
        <div className="card mt-4 text-cream/60">No upcoming confirmed bookings yet.</div>
      ) : (
        <div className="card mt-4 overflow-hidden p-0">
          <table className="w-full text-sm">
            <thead className="text-left text-cream/50">
              <tr className="border-b border-white/10">
                <th className="px-4 py-3 font-medium">Barber</th>
                <th className="px-4 py-3 text-right font-medium">Upcoming</th>
                <th className="px-4 py-3 text-right font-medium">Projected</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {barberRows.map((r) => (
                <tr key={r.name}>
                  <td className="px-4 py-3">{r.name}</td>
                  <td className="px-4 py-3 text-right text-cream/70">{r.count}</td>
                  <td className="px-4 py-3 text-right text-brass">{formatMoney(r.cents)}</td>
                </tr>
              ))}
              <tr className="border-t border-white/10 font-medium">
                <td className="px-4 py-3">Total</td>
                <td className="px-4 py-3 text-right text-cream/70">{upcoming.length}</td>
                <td className="px-4 py-3 text-right text-brass">{formatMoney(projectedTotal)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      <h2 className="mt-10 font-display text-2xl">Upcoming bookings</h2>
      {upcoming.length === 0 ? (
        <div className="card mt-4 text-cream/60">No upcoming bookings.</div>
      ) : (
        <div className="mt-4 space-y-2">
          {upcoming.slice(0, 12).map((a) => (
            <div key={a.id} className="card flex items-center justify-between py-3">
              <div>
                <div className="font-medium">{a.client.name}</div>
                <div className="text-sm text-cream/50">{a.service.name} · {a.barber.name}</div>
              </div>
              <div className="text-right">
                <div className="text-brass">{formatMoney(a.service.priceCents)}</div>
                <div className="text-xs text-cream/40">
                  {new Date(a.startTime).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                  {" · "}
                  {new Date(a.startTime).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
