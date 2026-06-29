import Link from "next/link";
import { requireStaffWithPerms } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/permissions";
import { formatMoney, classNames } from "@/lib/utils";
import { setAppointmentStatus } from "@/app/portal/actions";
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval,
  addMonths, format, isSameMonth, isSameDay, parseISO, isValid,
} from "date-fns";

export const dynamic = "force-dynamic";

const STATUS_DOT: Record<string, string> = {
  CONFIRMED: "bg-blue-400",
  COMPLETED: "bg-green-400",
  CANCELLED: "bg-red-400",
  NO_SHOW: "bg-yellow-400",
};
const STATUS_BADGE: Record<string, string> = {
  CONFIRMED: "bg-blue-500/20 text-blue-200",
  COMPLETED: "bg-green-500/20 text-green-200",
  CANCELLED: "bg-red-500/20 text-red-200",
  NO_SHOW: "bg-yellow-500/20 text-yellow-200",
};

export default async function AppointmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; date?: string }>;
}) {
  const user = await requireStaffWithPerms();
  const seesAll = can(user, "shop.viewAll");
  const barberScope = seesAll ? {} : { barberId: user.id };
  const sp = await searchParams;

  const monthBase = sp.month && isValid(parseISO(sp.month + "-01")) ? parseISO(sp.month + "-01") : new Date();
  const selected = sp.date && isValid(parseISO(sp.date)) ? parseISO(sp.date) : new Date();

  const gridStart = startOfWeek(startOfMonth(monthBase));
  const gridEnd = endOfWeek(endOfMonth(monthBase));
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });
  const monthKey = format(monthBase, "yyyy-MM");

  const appts = await prisma.appointment.findMany({
    where: { tenantId: user.tenantId, ...barberScope, startTime: { gte: gridStart, lte: gridEnd } },
    include: { service: true, client: true, barber: true },
    orderBy: { startTime: "asc" },
  });

  const dayAppts = (d: Date) => appts.filter((a) => isSameDay(a.startTime, d));
  const selectedAppts = dayAppts(selected);

  const prevKey = format(addMonths(monthBase, -1), "yyyy-MM");
  const nextKey = format(addMonths(monthBase, 1), "yyyy-MM");

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-3xl">Appointments</h1>
        <div className="flex items-center gap-2">
          <Link href={`/portal/appointments?month=${prevKey}`} className="btn-ghost px-3 py-1.5">←</Link>
          <span className="min-w-[10rem] text-center font-display text-lg">{format(monthBase, "MMMM yyyy")}</span>
          <Link href={`/portal/appointments?month=${nextKey}`} className="btn-ghost px-3 py-1.5">→</Link>
        </div>
      </div>

      {/* Calendar grid */}
      <div className="mt-5 overflow-hidden rounded-2xl border border-white/10">
        <div className="grid grid-cols-7 bg-charcoal/60 text-center text-xs text-cream/50">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
            <div key={d} className="py-2">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {days.map((d) => {
            const list = dayAppts(d);
            const inMonth = isSameMonth(d, monthBase);
            const isSel = isSameDay(d, selected);
            const isToday = isSameDay(d, new Date());
            return (
              <Link
                key={d.toISOString()}
                href={`/portal/appointments?month=${monthKey}&date=${format(d, "yyyy-MM-dd")}`}
                className={classNames(
                  "min-h-[92px] border-b border-r border-white/5 p-1.5 transition hover:bg-white/5",
                  !inMonth && "opacity-40",
                  isSel && "bg-brass/10 ring-1 ring-inset ring-brass/40",
                )}
              >
                <div className={classNames(
                  "mb-1 inline-flex h-6 w-6 items-center justify-center rounded-full text-xs",
                  isToday ? "bg-brass text-ink font-semibold" : "text-cream/70",
                )}>
                  {format(d, "d")}
                </div>
                <div className="space-y-1">
                  {list.slice(0, 3).map((a) => (
                    <div key={a.id} className="flex items-center gap-1 truncate text-[11px] text-cream/80">
                      <span className={classNames("h-1.5 w-1.5 shrink-0 rounded-full", STATUS_DOT[a.status])} />
                      <span className="truncate">{format(a.startTime, "h:mm")} {a.client.name}</span>
                    </div>
                  ))}
                  {list.length > 3 && <div className="text-[10px] text-cream/40">+{list.length - 3} more</div>}
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Selected day detail */}
      <h2 className="mt-8 font-display text-2xl">{format(selected, "EEEE, MMMM d")}</h2>
      {selectedAppts.length === 0 ? (
        <div className="card mt-3 text-cream/60">No appointments this day.</div>
      ) : (
        <div className="mt-3 space-y-2">
          {selectedAppts.map((a) => (
            <div key={a.id} className="card flex flex-wrap items-center justify-between gap-3 py-3">
              <div>
                <div className="font-medium">{format(a.startTime, "h:mm a")} · {a.client.name}</div>
                <div className="text-sm text-cream/50">
                  {a.service.name} · {formatMoney(a.service.priceCents)}{seesAll ? ` · ${a.barber.name}` : ""}
                  {a.client.phone ? ` · ${a.client.phone}` : ""}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`badge ${STATUS_BADGE[a.status] || "bg-white/10"}`}>{a.status}</span>
                {a.status === "CONFIRMED" && (
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
          ))}
        </div>
      )}

      <div className="mt-6 flex flex-wrap gap-4 text-xs text-cream/50">
        {Object.entries(STATUS_DOT).map(([k, c]) => (
          <span key={k} className="flex items-center gap-1.5"><span className={`h-2 w-2 rounded-full ${c}`} />{k}</span>
        ))}
      </div>
    </div>
  );
}
