import { requireStaffWithPerms } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { formatMoney } from "@/lib/utils";
import { can } from "@/lib/permissions";
import { startOfDay, endOfDay, startOfWeek, endOfWeek } from "date-fns";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await requireStaffWithPerms();
  const tenantId = user.tenantId;
  // Whole-shop view requires the shop.viewAll permission; otherwise scope to own book.
  const seesAll = can(user, "shop.viewAll");
  const barberScope = seesAll ? {} : { barberId: user.id };

  const now = new Date();
  const [todays, weekAppts, upcomingCount, clientCount] = await Promise.all([
    prisma.appointment.findMany({
      where: { tenantId, active: true, ...barberScope, startTime: { gte: startOfDay(now), lte: endOfDay(now) }, status: { in: ["CONFIRMED", "COMPLETED"] } },
      include: { service: true, client: true, barber: true },
      orderBy: { startTime: "asc" },
    }),
    prisma.appointment.findMany({
      where: { tenantId, active: true, ...barberScope, startTime: { gte: startOfWeek(now), lte: endOfWeek(now) }, status: { in: ["CONFIRMED", "COMPLETED"] } },
      include: { service: true },
    }),
    prisma.appointment.count({ where: { tenantId, active: true, ...barberScope, startTime: { gte: now }, status: "CONFIRMED" } }),
    prisma.client.count({ where: { tenantId } }),
  ]);

  const weekRevenue = weekAppts.reduce((sum, a) => sum + a.service.priceCents, 0);

  const stats = [
    { label: "Today's appointments", value: String(todays.length) },
    { label: "Upcoming (confirmed)", value: String(upcomingCount) },
    { label: "This week's revenue", value: formatMoney(weekRevenue) },
    { label: "Total clients", value: String(clientCount) },
  ];

  return (
    <div>
      <h1 className="font-display text-3xl">Welcome, {user.name?.split(" ")[0]}</h1>
      <p className="mt-1 text-cream/60">Here&apos;s your day at a glance.</p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="stat">
            <div className="text-2xl font-bold text-brass">{s.value}</div>
            <div className="mt-1 text-xs text-cream/50">{s.label}</div>
          </div>
        ))}
      </div>

      <h2 className="mt-10 font-display text-2xl">Today&apos;s schedule</h2>
      {todays.length === 0 ? (
        <div className="card mt-4 text-cream/60">No appointments today.</div>
      ) : (
        <div className="mt-4 space-y-2">
          {todays.map((a) => (
            <div key={a.id} className="card flex items-center justify-between py-3">
              <div>
                <div className="font-medium">{a.client.name}</div>
                <div className="text-sm text-cream/50">{a.service.name}{seesAll ? ` · ${a.barber.name}` : ""}</div>
              </div>
              <div className="text-right">
                <div className="text-brass">{new Date(a.startTime).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}</div>
                <div className="text-xs text-cream/40">{a.status}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
