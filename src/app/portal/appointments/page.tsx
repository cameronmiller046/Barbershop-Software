import { requireStaffWithPerms } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { formatMoney } from "@/lib/utils";
import { can } from "@/lib/permissions";
import { setAppointmentStatus } from "@/app/portal/actions";

export const dynamic = "force-dynamic";

const STATUS_COLORS: Record<string, string> = {
  CONFIRMED: "bg-blue-500/20 text-blue-200",
  COMPLETED: "bg-green-500/20 text-green-200",
  CANCELLED: "bg-red-500/20 text-red-200",
  NO_SHOW: "bg-yellow-500/20 text-yellow-200",
};

export default async function AppointmentsPage() {
  const user = await requireStaffWithPerms();
  const seesAll = can(user, "shop.viewAll");
  const barberScope = seesAll ? {} : { barberId: user.id };

  const appointments = await prisma.appointment.findMany({
    where: { tenantId: user.tenantId, ...barberScope },
    include: { service: true, client: true, barber: true },
    orderBy: { startTime: "desc" },
    take: 200,
  });

  const upcoming = appointments.filter((a) => a.startTime >= new Date() && a.status === "CONFIRMED");
  const past = appointments.filter((a) => !(a.startTime >= new Date() && a.status === "CONFIRMED"));

  return (
    <div>
      <h1 className="font-display text-3xl">Appointments</h1>

      <h2 className="mt-6 font-display text-xl text-brass">Upcoming</h2>
      {upcoming.length === 0 ? (
        <div className="card mt-3 text-cream/60">No upcoming appointments.</div>
      ) : (
        <div className="mt-3 space-y-2">
          {upcoming.map((a) => (
            <Row key={a.id} a={a} showBarber={seesAll} actionable />
          ))}
        </div>
      )}

      <h2 className="mt-10 font-display text-xl text-cream/70">History</h2>
      {past.length === 0 ? (
        <div className="card mt-3 text-cream/60">Nothing yet.</div>
      ) : (
        <div className="mt-3 space-y-2">
          {past.slice(0, 50).map((a) => (
            <Row key={a.id} a={a} showBarber={seesAll} actionable={false} />
          ))}
        </div>
      )}
    </div>
  );
}

type ApptRow = {
  id: string;
  status: string;
  startTime: Date;
  client: { name: string; phone: string | null };
  service: { name: string; priceCents: number };
  barber: { name: string };
};

function Row({ a, showBarber, actionable }: { a: ApptRow; showBarber: boolean; actionable: boolean }) {
  return (
    <div className="card flex flex-wrap items-center justify-between gap-3 py-3">
      <div>
        <div className="font-medium">{a.client.name}</div>
        <div className="text-sm text-cream/50">
          {a.service.name} · {formatMoney(a.service.priceCents)}{showBarber ? ` · ${a.barber.name}` : ""}
        </div>
        {a.client.phone && <div className="text-xs text-cream/40">{a.client.phone}</div>}
      </div>
      <div className="flex items-center gap-3">
        <div className="text-right">
          <div className="text-sm">{new Date(a.startTime).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</div>
          <div className="text-xs text-cream/50">{new Date(a.startTime).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}</div>
        </div>
        <span className={`badge ${STATUS_COLORS[a.status] || "bg-white/10"}`}>{a.status}</span>
        {actionable && (
          <div className="flex gap-1">
            <form action={setAppointmentStatus.bind(null, a.id, "COMPLETED")}>
              <button className="rounded-md bg-green-500/15 px-2 py-1 text-xs text-green-200 hover:bg-green-500/25">Done</button>
            </form>
            <form action={setAppointmentStatus.bind(null, a.id, "NO_SHOW")}>
              <button className="rounded-md bg-yellow-500/15 px-2 py-1 text-xs text-yellow-200 hover:bg-yellow-500/25">No-show</button>
            </form>
            <form action={setAppointmentStatus.bind(null, a.id, "CANCELLED")}>
              <button className="rounded-md bg-red-500/15 px-2 py-1 text-xs text-red-200 hover:bg-red-500/25">Cancel</button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
