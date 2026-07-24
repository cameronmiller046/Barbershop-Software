import Link from "next/link";
import { cookies } from "next/headers";
import { requireStaffWithPerms } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/permissions";
import { formatMoney, classNames } from "@/lib/utils";
import { AppointmentActions } from "@/components/AppointmentActions";
import { WalkInLogger } from "@/components/WalkInLogger";
import { RememberPref } from "@/components/RememberPref";
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek, startOfDay, endOfDay,
  eachDayOfInterval, addMonths, addDays, format, isSameMonth, isSameDay, parseISO, isValid,
} from "date-fns";

type CalView = "day" | "week" | "month";

export const dynamic = "force-dynamic";

const STATUS_DOT: Record<string, string> = {
  CONFIRMED: "bg-amber-400",
  COMPLETED: "bg-emerald-400",
  CANCELLED: "bg-red-400",
  NO_SHOW: "bg-zinc-400",
};
const STATUS_BADGE: Record<string, string> = {
  CONFIRMED: "bg-amber-500/20 text-amber-200",
  COMPLETED: "bg-emerald-500/20 text-emerald-200",
  CANCELLED: "bg-red-500/20 text-red-200",
  NO_SHOW: "bg-zinc-500/25 text-zinc-200",
};

export default async function AppointmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; date?: string; view?: string }>;
}) {
  const user = await requireStaffWithPerms();
  const seesAll = can(user, "shop.viewAll");
  const barberScope = seesAll ? {} : { barberId: user.id };
  const [tenant, services, clientList] = await Promise.all([
    prisma.tenant.findUnique({ where: { id: user.tenantId }, select: { slug: true } }),
    prisma.service.findMany({ where: { tenantId: user.tenantId, active: true }, select: { id: true, name: true, priceCents: true }, orderBy: { sortOrder: "asc" } }),
    prisma.client.findMany({ where: { tenantId: user.tenantId }, select: { name: true, phone: true }, orderBy: { name: "asc" }, take: 1000 }),
  ]);
  const sp = await searchParams;
  // View preference: explicit ?view= wins; otherwise fall back to the saved
  // cookie; otherwise month. RememberPref (below) keeps the cookie in sync.
  const asView = (v: string | undefined): CalView | null =>
    v === "day" || v === "week" || v === "month" ? v : null;
  const savedView = asView((await cookies()).get("cal_view")?.value);
  const view: CalView = asView(sp.view) ?? savedView ?? "month";

  const monthBase = sp.month && isValid(parseISO(sp.month + "-01")) ? parseISO(sp.month + "-01") : new Date();
  const selected = sp.date && isValid(parseISO(sp.date)) ? parseISO(sp.date) : new Date();
  const monthKey = format(monthBase, "yyyy-MM");
  const fmt = (d: Date) => format(d, "yyyy-MM-dd");
  const hrefFor = (o: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries(o)) if (v) p.set(k, v);
    return `/portal/appointments?${p.toString()}`;
  };

  // Data range + prev/next + title all depend on the active view.
  let rangeStart: Date, rangeEnd: Date, title: string, prevHref: string, nextHref: string;
  if (view === "day") {
    rangeStart = startOfDay(selected); rangeEnd = endOfDay(selected);
    title = format(selected, "EEEE, MMMM d");
    prevHref = hrefFor({ view, date: fmt(addDays(selected, -1)) });
    nextHref = hrefFor({ view, date: fmt(addDays(selected, 1)) });
  } else if (view === "week") {
    rangeStart = startOfWeek(selected); rangeEnd = endOfWeek(selected);
    title = `${format(rangeStart, "MMM d")} – ${format(rangeEnd, "MMM d")}`;
    prevHref = hrefFor({ view, date: fmt(addDays(selected, -7)) });
    nextHref = hrefFor({ view, date: fmt(addDays(selected, 7)) });
  } else {
    rangeStart = startOfWeek(startOfMonth(monthBase)); rangeEnd = endOfWeek(endOfMonth(monthBase));
    title = format(monthBase, "MMMM yyyy");
    prevHref = hrefFor({ view, month: format(addMonths(monthBase, -1), "yyyy-MM"), date: sp.date });
    nextHref = hrefFor({ view, month: format(addMonths(monthBase, 1), "yyyy-MM"), date: sp.date });
  }

  const appts = await prisma.appointment.findMany({
    where: { tenantId: user.tenantId, active: true, ...barberScope, startTime: { gte: rangeStart, lte: rangeEnd } },
    include: { service: true, client: true, barber: true },
    orderBy: { startTime: "asc" },
  });
  const dayAppts = (d: Date) => appts.filter((a) => isSameDay(a.startTime, d));
  const monthDays = eachDayOfInterval({ start: rangeStart, end: rangeEnd });
  const weekDays = view === "week" ? eachDayOfInterval({ start: rangeStart, end: rangeEnd }) : [];

  return (
    <div>
      <RememberPref name="cal_view" value={view} />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-3xl">Appointments</h1>
        <div className="flex items-center gap-2">
          <WalkInLogger services={services} clients={clientList} />
          {/* View switcher */}
          <div className="inline-flex rounded-full border border-white/10 p-0.5 text-sm">
            {(["day", "week", "month"] as CalView[]).map((v) => (
              <Link
                key={v}
                href={hrefFor({ view: v, date: fmt(selected), month: monthKey })}
                className={classNames(
                  "rounded-full px-3 py-1 capitalize transition",
                  v === view ? "bg-brass font-semibold text-ink" : "text-cream/60 hover:text-cream",
                )}
              >
                {v}
              </Link>
            ))}
          </div>
          <Link href={prevHref} className="btn-ghost px-3 py-1.5">←</Link>
          <span className="min-w-[9rem] text-center font-display text-lg">{title}</span>
          <Link href={nextHref} className="btn-ghost px-3 py-1.5">→</Link>
        </div>
      </div>

      {/* MONTH: calendar grid */}
      {view === "month" && (
        <div className="mt-5 overflow-hidden rounded-2xl border border-white/10">
          <div className="grid grid-cols-7 bg-charcoal/60 text-center text-xs text-cream/50">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => <div key={d} className="py-2">{d}</div>)}
          </div>
          <div className="grid grid-cols-7">
            {monthDays.map((d) => {
              const list = dayAppts(d);
              const inMonth = isSameMonth(d, monthBase);
              const isSel = isSameDay(d, selected);
              const isToday = isSameDay(d, new Date());
              return (
                <Link
                  key={d.toISOString()}
                  href={hrefFor({ view: "day", date: fmt(d), month: monthKey })}
                  className={classNames(
                    "min-h-[92px] border-b border-r border-white/5 p-1.5 transition hover:bg-white/5",
                    !inMonth && "opacity-40",
                    isSel && "bg-brass/10 ring-1 ring-inset ring-brass/40",
                  )}
                >
                  <div className={classNames("mb-1 inline-flex h-6 w-6 items-center justify-center rounded-full text-xs", isToday ? "bg-brass font-semibold text-ink" : "text-cream/70")}>
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
      )}

      {/* WEEK: 7 day columns */}
      {view === "week" && (
        <div className="mt-5 overflow-x-auto rounded-2xl border border-white/10">
          <div className="grid min-w-[720px] grid-cols-7">
            {weekDays.map((d) => {
              const list = dayAppts(d);
              const isToday = isSameDay(d, new Date());
              return (
                <div key={d.toISOString()} className="min-h-[320px] border-r border-white/5 last:border-r-0">
                  <Link href={hrefFor({ view: "day", date: fmt(d) })} className="block border-b border-white/5 py-2 text-center transition hover:bg-white/5">
                    <div className="text-xs text-cream/50">{format(d, "EEE")}</div>
                    <div className={classNames("mx-auto mt-0.5 inline-flex h-7 w-7 items-center justify-center rounded-full text-sm", isToday ? "bg-brass font-semibold text-ink" : "text-cream/80")}>{format(d, "d")}</div>
                  </Link>
                  <div className="space-y-1 p-1.5">
                    {list.length === 0 && <div className="px-1 pt-2 text-center text-[10px] text-cream/25">—</div>}
                    {list.map((a) => (
                      <Link key={a.id} href={hrefFor({ view: "day", date: fmt(d) })} className="block rounded-lg border border-white/5 bg-white/[0.03] px-1.5 py-1 transition hover:bg-white/[0.07]">
                        <div className="flex items-center gap-1 text-[11px] text-cream/85">
                          <span className={classNames("h-1.5 w-1.5 shrink-0 rounded-full", STATUS_DOT[a.status])} />
                          <span className="font-medium">{format(a.startTime, "h:mm")}</span>
                        </div>
                        <div className="truncate text-[11px] text-cream/60">{a.client.name}</div>
                      </Link>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* DAY (and the detail list under the MONTH grid) */}
      {(view === "day" || view === "month") && (
        <>
          <h2 className="mt-8 font-display text-2xl">{format(selected, "EEEE, MMMM d")}</h2>
          {dayAppts(selected).length === 0 ? (
            <div className="card mt-3 text-cream/60">No appointments this day.</div>
          ) : (
            <div className="mt-3 space-y-2">
              {dayAppts(selected).map((a) => (
                <div key={a.id} className="card flex flex-wrap items-center justify-between gap-3 py-3">
                  <div>
                    <div className="font-medium">{format(a.startTime, "h:mm a")} · {a.client.name}</div>
                    <div className="text-sm text-cream/50">
                      {a.service.name} · {formatMoney(a.service.priceCents)}{seesAll ? ` · ${a.barber.name}` : ""}
                      {a.client.phone ? ` · ${a.client.phone}` : ""}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <div className="flex items-center gap-2">
                      <span className={`badge ${STATUS_BADGE[a.status] || "bg-white/10"}`}>{a.status.replace("_", " ")}</span>
                      {a.statusReason && <span className="text-[11px] text-cream/40">· {a.statusReason}</span>}
                    </div>
                    <AppointmentActions id={a.id} slug={tenant?.slug ?? ""}
                      serviceId={a.serviceId} barberId={a.barberId} status={a.status}
                      startedISO={a.startedAt?.toISOString() ?? null} finishedISO={a.finishedAt?.toISOString() ?? null}
                      canCorrect={seesAll} servicePriceCents={a.collectedCents ?? a.service.priceCents} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      <div className="mt-6 flex flex-wrap gap-4 text-xs text-cream/50">
        {Object.entries(STATUS_DOT).map(([k, c]) => (
          <span key={k} className="flex items-center gap-1.5"><span className={`h-2 w-2 rounded-full ${c}`} />{k}</span>
        ))}
      </div>
    </div>
  );
}
