import Link from "next/link";
import { requireStaffWithPerms } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { formatMoney } from "@/lib/utils";
import { can } from "@/lib/permissions";
import { AppointmentActions } from "@/components/AppointmentActions";
import { WalkInLogger } from "@/components/WalkInLogger";
import { startOfDay, endOfDay, startOfWeek, endOfWeek } from "date-fns";

export const dynamic = "force-dynamic";

const timeOf = (d: Date) => new Date(d).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });

export default async function DashboardPage() {
  const user = await requireStaffWithPerms();
  const tenantId = user.tenantId;
  // Whole-shop view requires the shop.viewAll permission; otherwise scope to own book.
  const seesAll = can(user, "shop.viewAll");
  const barberScope = seesAll ? {} : { barberId: user.id };

  const now = new Date();
  const [tenant, services, clientList, todays, weekAppts, upcomingCount, clientCount] = await Promise.all([
    prisma.tenant.findUnique({ where: { id: tenantId }, select: { slug: true } }),
    prisma.service.findMany({ where: { tenantId, active: true }, select: { id: true, name: true, priceCents: true }, orderBy: { sortOrder: "asc" } }),
    prisma.client.findMany({ where: { tenantId }, select: { name: true }, orderBy: { name: "asc" }, take: 500 }),
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

  const weekRevenue = weekAppts.reduce((sum, a) => sum + (a.collectedCents ?? a.service.priceCents), 0);

  // People physically here: walk-ins checked in via the kiosk (or logged) that
  // aren't finished yet. This is the live queue barbers work through.
  const waiting = todays.filter((a) => a.kind === "WALKIN" && a.status === "CONFIRMED");
  const scheduled = todays.filter((a) => a.kind !== "WALKIN" && a.status === "CONFIRMED");
  const done = todays.filter((a) => a.status === "COMPLETED");

  const stats = [
    { label: "Waiting now", value: String(waiting.length), highlight: waiting.length > 0 },
    { label: "Completed today", value: String(done.length) },
    { label: "Upcoming (confirmed)", value: String(upcomingCount) },
    { label: "This week's revenue", value: formatMoney(weekRevenue) },
    { label: "Total clients", value: String(clientCount) },
  ];

  const slug = tenant?.slug ?? "";
  const actions = (a: (typeof todays)[number]) => (
    <AppointmentActions id={a.id} slug={slug}
      serviceId={a.serviceId} barberId={a.barberId} status={a.status}
      startedISO={a.startedAt?.toISOString() ?? null} finishedISO={a.finishedAt?.toISOString() ?? null}
      canCorrect={seesAll} servicePriceCents={a.collectedCents ?? a.service.priceCents} />
  );

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl">Welcome, {user.name?.split(" ")[0]}</h1>
          <p className="mt-1 text-cream/60">Here&apos;s your day at a glance.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <WalkInLogger services={services} clients={clientList} />
          {seesAll && (
            <Link href="/kiosk" target="_blank" className="btn-ghost px-4 py-2 text-sm">Open check-in kiosk ↗</Link>
          )}
          <Link href="/portal/appointments" className="btn-ghost px-4 py-2 text-sm">All appointments</Link>
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {stats.map((s) => (
          <div key={s.label} className={`stat ${s.highlight ? "ring-1 ring-brass/50" : ""}`}>
            <div className="text-2xl font-bold text-brass">{s.value}</div>
            <div className="mt-1 text-xs text-cream/50">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Live walk-in queue — who's checked in and waiting */}
      <div className="mt-10 flex items-center justify-between">
        <h2 className="font-display text-2xl">Checked in &amp; waiting</h2>
        {waiting.length > 0 && <span className="badge bg-brass/20 text-brass">{waiting.length} in line</span>}
      </div>
      {waiting.length === 0 ? (
        <div className="card mt-3 text-cream/60">
          No one&apos;s waiting. Walk-ins check in at the <Link href="/kiosk" target="_blank" className="text-brass hover:underline">self check-in kiosk</Link> and appear here.
        </div>
      ) : (
        <div className="mt-3 space-y-2">
          {waiting.map((a, i) => {
            const inChair = !!a.startedAt;
            return (
              <div key={a.id} className="card flex flex-wrap items-center justify-between gap-3 py-3">
                <div className="flex items-center gap-3">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brass/15 text-sm font-semibold text-brass">{i + 1}</span>
                  <div>
                    <div className="font-medium">
                      {a.client.name}
                      {inChair && <span className="badge ml-2 bg-emerald-500/20 text-emerald-200">In the chair</span>}
                    </div>
                    <div className="text-sm text-cream/50">
                      {a.service.name} · {formatMoney(a.collectedCents ?? a.service.priceCents)}{seesAll ? ` · ${a.barber.name}` : ""}
                      {" · "}since {timeOf(a.startTime)}
                    </div>
                  </div>
                </div>
                {actions(a)}
              </div>
            );
          })}
        </div>
      )}

      {/* Scheduled appointments for today */}
      <h2 className="mt-10 font-display text-2xl">Scheduled today</h2>
      {scheduled.length === 0 ? (
        <div className="card mt-3 text-cream/60">No scheduled appointments left today.</div>
      ) : (
        <div className="mt-3 space-y-2">
          {scheduled.map((a) => (
            <div key={a.id} className="card flex flex-wrap items-center justify-between gap-3 py-3">
              <div>
                <div className="font-medium">{timeOf(a.startTime)} · {a.client.name}</div>
                <div className="text-sm text-cream/50">
                  {a.service.name}{seesAll ? ` · ${a.barber.name}` : ""}
                  {a.client.phone ? ` · ${a.client.phone}` : ""}
                </div>
              </div>
              {actions(a)}
            </div>
          ))}
        </div>
      )}

      {done.length > 0 && (
        <>
          <h2 className="mt-10 font-display text-2xl">Completed today</h2>
          <div className="mt-3 space-y-2">
            {done.map((a) => (
              <div key={a.id} className="card flex flex-wrap items-center justify-between gap-3 py-3 opacity-80">
                <div>
                  <div className="font-medium">{a.client.name}</div>
                  <div className="text-sm text-cream/50">{a.service.name}{seesAll ? ` · ${a.barber.name}` : ""}</div>
                </div>
                <div className="text-right">
                  <div className="text-brass">{formatMoney(a.collectedCents ?? a.service.priceCents)}</div>
                  <div className="text-xs text-cream/40">collected</div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
