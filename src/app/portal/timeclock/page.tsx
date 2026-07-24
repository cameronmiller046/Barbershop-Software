import { requireStaffWithPerms, getPortalTenant } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/permissions";
import { startOfDayInTz, startOfWeekInTz, endOfWeekInTz } from "@/lib/tz";
import { TimeClock } from "@/components/portal/TimeClock";
import { SuggestTimeEdit } from "@/components/portal/SuggestTimeEdit";
import { clockOutStaff } from "./actions";
import { Icon } from "@/components/home/icons";

export const dynamic = "force-dynamic";

const durMin = (inD: Date, outD: Date | null) => Math.max(0, Math.round(((outD ?? new Date()).getTime() - inD.getTime()) / 60_000));
type BreakSpan = { start: Date; end: Date | null };
const breakMin = (breaks: BreakSpan[]) => breaks.reduce((s, b) => s + durMin(b.start, b.end), 0);
// Paid/worked minutes = shift length minus break time (an open break counts up to now).
const workedMin = (inD: Date, outD: Date | null, breaks: BreakSpan[]) => Math.max(0, durMin(inD, outD) - breakMin(breaks));
const fmtDur = (m: number) => { const h = Math.floor(m / 60); return h ? `${h}h ${m % 60}m` : `${m}m`; };
const fmtTime = (d: Date) => d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
const fmtDay = (d: Date) => d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });

export default async function TimeClockPage() {
  const user = await requireStaffWithPerms();
  const tenantId = user.tenantId;
  const seesAll = can(user, "shop.viewAll") || can(user, "shop.team");
  // Shop-local day/week so hours roll over at the shop's midnight, not the server's.
  const tenant = await getPortalTenant(tenantId); // request-cached by the layout
  const tz = tenant?.timezone || "America/New_York";
  const now = new Date();
  const dayStart = startOfDayInTz(now, tz), weekStart = startOfWeekInTz(now, tz), weekEnd = endOfWeekInTz(now, tz);

  const [open, myWeek, pendingReqs] = await Promise.all([
    prisma.timeEntry.findFirst({ where: { tenantId, userId: user.id, clockOut: null }, orderBy: { clockIn: "desc" }, include: { breaks: { select: { start: true, end: true } } } }),
    prisma.timeEntry.findMany({ where: { tenantId, userId: user.id, clockIn: { gte: weekStart, lte: weekEnd } }, orderBy: { clockIn: "desc" }, include: { breaks: { select: { start: true, end: true } } } }),
    prisma.timeEditRequest.findMany({ where: { tenantId, userId: user.id, status: "PENDING" }, select: { entryId: true } }),
  ]);
  const pendingSet = new Set(pendingReqs.map((r) => r.entryId));
  const myTodayMin = myWeek.filter((e) => e.clockOut && e.clockIn >= dayStart).reduce((s, e) => s + workedMin(e.clockIn, e.clockOut, e.breaks), 0);
  const myWeekMin = myWeek.reduce((s, e) => s + workedMin(e.clockIn, e.clockOut, e.breaks), 0);
  // Break state for the open shift: an in-progress break + completed break minutes so far.
  const openBreak = open?.breaks.find((b) => !b.end) ?? null;
  const openShiftBreakMin = open ? breakMin(open.breaks.filter((b) => b.end)) : 0;

  let staffRows: { id: string; name: string; weekMin: number; onSinceISO: string | null; onBreakSinceISO: string | null }[] | null = null;
  if (seesAll) {
    const [staff, weekEntries, openEntries] = await Promise.all([
      prisma.user.findMany({ where: { tenantId, role: { in: ["OWNER", "BARBER", "RECEPTIONIST"] }, active: true, kioskOnly: false }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
      prisma.timeEntry.findMany({ where: { tenantId, clockIn: { gte: weekStart, lte: weekEnd } }, select: { userId: true, clockIn: true, clockOut: true, breaks: { select: { start: true, end: true } } } }),
      prisma.timeEntry.findMany({ where: { tenantId, clockOut: null }, select: { userId: true, clockIn: true, breaks: { where: { end: null }, select: { start: true } } } }),
    ]);
    const openMap = new Map(openEntries.map((e) => [e.userId, e.clockIn]));
    const breakMap = new Map(openEntries.map((e) => [e.userId, e.breaks[0]?.start ?? null]));
    const minByUser = new Map<string, number>();
    for (const e of weekEntries) minByUser.set(e.userId, (minByUser.get(e.userId) ?? 0) + workedMin(e.clockIn, e.clockOut, e.breaks));
    staffRows = staff
      .map((s) => ({ id: s.id, name: s.name, weekMin: minByUser.get(s.id) ?? 0, onSinceISO: openMap.get(s.id)?.toISOString() ?? null, onBreakSinceISO: breakMap.get(s.id)?.toISOString() ?? null }))
      .sort((a, b) => (a.onSinceISO ? 0 : 1) - (b.onSinceISO ? 0 : 1) || a.name.localeCompare(b.name));
  }

  const onNow = staffRows?.filter((s) => s.onSinceISO).length ?? (open ? 1 : 0);

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="font-display text-2xl text-cream sm:text-3xl">Time Clock</h1>
      <p className="mt-1 text-cream/55">Clock in and out to track your shift hours.</p>

      <div className="mt-6 grid gap-5 lg:grid-cols-[340px_1fr]">
        {/* Personal clock */}
        <div className="space-y-5">
          <TimeClock
            openSinceISO={open?.clockIn.toISOString() ?? null}
            todayMinutes={myTodayMin}
            onBreakSinceISO={openBreak?.start.toISOString() ?? null}
            shiftBreakMinutes={openShiftBreakMin}
          />
          <div className="p-panel grid grid-cols-2 gap-3 p-5">
            <div className="text-center"><div className="font-display text-2xl font-semibold text-brass">{fmtDur(myTodayMin)}</div><div className="mt-0.5 text-xs text-cream/45">Today</div></div>
            <div className="text-center"><div className="font-display text-2xl font-semibold text-cream">{fmtDur(myWeekMin)}</div><div className="mt-0.5 text-xs text-cream/45">This week</div></div>
          </div>
        </div>

        {/* Personal history */}
        <div className="p-panel p-5">
          <h3 className="font-display text-lg text-cream">Your recent shifts</h3>
          {myWeek.length === 0 ? (
            <p className="mt-3 text-sm text-cream/45">No shifts this week yet — clock in to get started.</p>
          ) : (
            <div className="mt-4 space-y-2">
              {myWeek.map((e) => (
                <div key={e.id} className="flex items-center justify-between gap-3 rounded-xl border border-white/8 bg-white/[0.02] p-3 text-sm">
                  <div className="min-w-0">
                    <div className="text-cream">{fmtDay(e.clockIn)}</div>
                    <div className="text-xs text-cream/45">
                      {fmtTime(e.clockIn)} – {e.clockOut ? fmtTime(e.clockOut) : <span className="text-emerald-300">on the clock</span>}
                      {breakMin(e.breaks) > 0 && <span className="text-amber-300/70"> · {fmtDur(breakMin(e.breaks))} break</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className={`font-medium ${e.clockOut ? "text-cream/80" : "text-emerald-300"}`}>{fmtDur(workedMin(e.clockIn, e.clockOut, e.breaks))}</div>
                    <SuggestTimeEdit entryId={e.id} clockInISO={e.clockIn.toISOString()} clockOutISO={e.clockOut?.toISOString() ?? null} pending={pendingSet.has(e.id)} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Admin: shop-wide */}
      {staffRows && (
        <div className="mt-6 p-panel p-5">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-lg text-cream">Team hours this week</h3>
            <span className="flex items-center gap-1.5 text-xs text-emerald-300"><span className="p-live-dot h-1.5 w-1.5 rounded-full bg-emerald-400" /> {onNow} on the clock</span>
          </div>
          <div className="mt-4 space-y-2">
            {staffRows.map((s) => (
              <div key={s.id} className="flex items-center gap-3 rounded-xl border border-white/8 bg-white/[0.02] p-3">
                <span className={`h-2 w-2 shrink-0 rounded-full ${s.onBreakSinceISO ? "bg-amber-400" : s.onSinceISO ? "p-live-dot bg-emerald-400" : "bg-cream/25"}`} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm text-cream">{s.name}</div>
                  <div className="text-xs text-cream/45">
                    {s.onBreakSinceISO ? (
                      <span className="text-amber-300/80">On break since {fmtTime(new Date(s.onBreakSinceISO))}</span>
                    ) : s.onSinceISO ? (
                      `Clocked in at ${fmtTime(new Date(s.onSinceISO))}`
                    ) : (
                      "Off the clock"
                    )}
                  </div>
                </div>
                <div className="text-sm font-medium text-cream/80">{fmtDur(s.weekMin)}</div>
                {s.onSinceISO && (
                  <form action={clockOutStaff.bind(null, s.id)}>
                    <button className="rounded-full border border-red-400/30 bg-red-400/10 px-3 py-1 text-xs text-red-200 transition hover:bg-red-400/20" title="Clock this staff member out"><Icon.logout className="mr-1 inline h-3 w-3" />Clock out</button>
                  </form>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
