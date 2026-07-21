import Link from "next/link";
import { requireStaffWithPerms } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/permissions";
import { formatMoney } from "@/lib/utils";
import { apptState, STATE_LABEL, type ApptState } from "@/lib/apptStatus";
import { startOfDay, endOfDay, subDays, startOfWeek, endOfWeek } from "date-fns";
import { Reveal, Counter } from "@/components/home/motion";
import { Icon, type IconName } from "@/components/home/icons";
import { WalkInLogger } from "@/components/WalkInLogger";
import { CurrentClientPanel, CurrentClientEmpty } from "@/components/portal/CurrentClientPanel";
import { QuickAction } from "@/components/portal/QuickAction";
import { TimeClock } from "@/components/portal/TimeClock";

export const dynamic = "force-dynamic";

const fmtTime = (d: Date) => new Date(d).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });

export default async function DashboardPage() {
  const user = await requireStaffWithPerms();
  const tenantId = user.tenantId;
  const seesAll = can(user, "shop.viewAll");
  const scope = seesAll ? {} : { barberId: user.id };

  const now = new Date();
  const dayStart = startOfDay(now), dayEnd = endOfDay(now);
  const yStart = startOfDay(subDays(now, 1)), yEnd = endOfDay(subDays(now, 1));
  const weekStart = startOfWeek(now), weekEnd = endOfWeek(now);

  const [tenant, services, clientList, barbers, todays, yesterday, weekRev, myClockOpen, myClockToday] = await Promise.all([
    prisma.tenant.findUnique({ where: { id: tenantId }, select: { name: true, slug: true } }),
    prisma.service.findMany({ where: { tenantId, active: true }, select: { id: true, name: true, priceCents: true }, orderBy: { sortOrder: "asc" } }),
    prisma.client.findMany({ where: { tenantId }, select: { name: true, phone: true }, orderBy: { name: "asc" }, take: 1000 }),
    prisma.user.findMany({ where: { tenantId, role: "BARBER", active: true, kioskOnly: false }, select: { id: true } }),
    prisma.appointment.findMany({
      where: { tenantId, active: true, ...scope, startTime: { gte: dayStart, lte: dayEnd } },
      include: { service: true, client: true, barber: { select: { name: true } } },
      orderBy: { startTime: "asc" },
    }),
    prisma.appointment.findMany({
      where: { tenantId, active: true, ...scope, status: "COMPLETED", finishedAt: { gte: yStart, lte: yEnd } },
      select: { collectedCents: true, startedAt: true, finishedAt: true, service: { select: { priceCents: true } } },
    }),
    prisma.appointment.findMany({
      where: { tenantId, active: true, status: "COMPLETED", startTime: { gte: weekStart, lte: weekEnd } },
      select: { collectedCents: true, service: { select: { priceCents: true } } },
    }),
    prisma.timeEntry.findFirst({ where: { tenantId, userId: user.id, clockOut: null }, orderBy: { clockIn: "desc" } }),
    prisma.timeEntry.findMany({ where: { tenantId, userId: user.id, clockOut: { not: null }, clockIn: { gte: dayStart } }, select: { clockIn: true, clockOut: true } }),
  ]);
  const myClockTodayMin = myClockToday.reduce((s, e) => s + Math.max(0, Math.round(((e.clockOut as Date).getTime() - e.clockIn.getTime()) / 60_000)), 0);

  const revenueOf = (a: { collectedCents: number | null; service: { priceCents: number } }) => a.collectedCents ?? a.service.priceCents;

  const visible = todays.filter((a) => a.status === "CONFIRMED" || a.status === "COMPLETED");
  const completed = todays.filter((a) => a.status === "COMPLETED");
  const inService = todays.filter((a) => a.status === "CONFIRMED" && a.startedAt && !a.finishedAt);
  const notStarted = todays.filter((a) => a.status === "CONFIRMED" && !a.startedAt);
  const waiting = notStarted.filter((a) => a.checkedInAt || a.kind === "WALKIN");

  const todayRevenue = completed.reduce((s, a) => s + revenueOf(a), 0);
  const cutMins = completed.filter((a) => a.startedAt && a.finishedAt).map((a) => (a.finishedAt!.getTime() - a.startedAt!.getTime()) / 60000);
  const avgCut = cutMins.length ? Math.round(cutMins.reduce((s, x) => s + x, 0) / cutMins.length) : 0;

  const yCompleted = yesterday.length;
  const yRevenue = yesterday.reduce((s, a) => s + (a.collectedCents ?? a.service.priceCents), 0);
  const yMins = yesterday.filter((a) => a.startedAt && a.finishedAt).map((a) => (a.finishedAt!.getTime() - a.startedAt!.getTime()) / 60000);
  const yAvg = yMins.length ? Math.round(yMins.reduce((s, x) => s + x, 0) / yMins.length) : 0;

  const completedDelta = completed.length - yCompleted;
  const revenuePct = yRevenue > 0 ? Math.round(((todayRevenue - yRevenue) / yRevenue) * 100) : todayRevenue > 0 ? 100 : 0;
  const cutDelta = avgCut && yAvg ? avgCut - yAvg : 0;

  const current = inService[0] ?? null;
  const nextUp = notStarted.find((a) => a.id !== current?.id) ?? null;
  const weekRevenue = weekRev.reduce((s, a) => s + revenueOf(a), 0);

  // Recent activity (derived from today's appointments)
  type Ev = { t: Date; icon: IconName; label: string; tone: string; time: string };
  const events: Ev[] = [];
  for (const a of todays) {
    if (a.finishedAt) {
      events.push({ t: a.finishedAt, icon: "scissors", label: `${a.client.name} · cut completed`, tone: "text-emerald-300", time: fmtTime(a.finishedAt) });
      events.push({ t: a.finishedAt, icon: "dollar", label: `Payment · ${formatMoney(revenueOf(a))}`, tone: "text-brass", time: fmtTime(a.finishedAt) });
    } else if (a.startedAt) {
      events.push({ t: a.startedAt, icon: "scissors", label: `${a.client.name} · in service`, tone: "text-emerald-300", time: fmtTime(a.startedAt) });
    } else if (a.checkedInAt) {
      events.push({ t: a.checkedInAt, icon: "checkin", label: `${a.client.name} checked in`, tone: "text-brass", time: fmtTime(a.checkedInAt) });
    }
  }
  events.sort((x, y) => y.t.getTime() - x.t.getTime());
  const recent = events.slice(0, 6);

  const firstName = user.name.split(" ")[0];
  const hour = now.getHours();
  const greet = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  const kpis: { label: string; value: React.ReactNode; icon: IconName; sub: React.ReactNode }[] = [
    { label: "Appointments Today", icon: "booking", value: <Counter to={visible.length} />, sub: <span className="text-cream/45">{notStarted.length} remaining</span> },
    { label: "Completed Cuts", icon: "check", value: <Counter to={completed.length} />, sub: <Trend n={completedDelta} unit=" from yesterday" /> },
    { label: "Today's Revenue", icon: "dollar", value: <Counter to={Math.round(todayRevenue / 100)} prefix="$" />, sub: <Trend n={revenuePct} unit="% from yesterday" pct /> },
    { label: "Avg. Cut Time", icon: "clock", value: <><Counter to={avgCut} /> min</>, sub: <Trend n={cutDelta} unit=" min from yesterday" invert /> },
  ];
  if (seesAll) {
    kpis.push(
      { label: "Shop Revenue (wk)", icon: "gauge", value: <Counter to={Math.round(weekRevenue / 100)} prefix="$" />, sub: <span className="text-cream/45">this week</span> },
      { label: "Active Barbers", icon: "staff", value: <Counter to={barbers.length} />, sub: <span className="text-cream/45">on the floor</span> },
    );
  }

  return (
    <div className="mx-auto max-w-[1500px]">
      {/* Greeting */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl text-cream sm:text-3xl">{greet}, {firstName} <span className="align-middle">👋</span></h1>
          <p className="mt-1 text-cream/55">Here&apos;s what&apos;s happening at {tenant?.name ?? "your shop"} today.</p>
        </div>
        <div className="flex items-center gap-2">
          <WalkInLogger services={services} clients={clientList} />
        </div>
      </div>

      {/* KPI cards */}
      <div className={`mt-6 grid gap-4 sm:grid-cols-2 ${seesAll ? "xl:grid-cols-6" : "lg:grid-cols-4"}`}>
        {kpis.map((k, i) => {
          const KI = Icon[k.icon];
          return (
            <Reveal key={k.label} delay={i * 0.05} className="p-panel p-kpi p-5">
              <div className="flex items-start justify-between">
                <span className="text-xs text-cream/50">{k.label}</span>
                <span className="grid h-8 w-8 place-items-center rounded-lg border border-brass/25 bg-brass/[0.07] text-brass"><KI className="h-4 w-4" /></span>
              </div>
              <div className="mt-3 font-display text-3xl font-semibold text-cream tabular-nums">{k.value}</div>
              <div className="mt-1 text-xs">{k.sub}</div>
            </Reveal>
          );
        })}
      </div>

      {/* Main grid */}
      <div className="mt-5 grid gap-5 xl:grid-cols-[1.5fr_1fr_1fr]">
        {/* Schedule */}
        <section className="order-2 xl:order-1">
          <div className="p-panel flex h-full flex-col p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-display text-lg text-cream">Today&apos;s Schedule</h2>
              <div className="flex items-center gap-1 rounded-full border border-white/10 p-0.5 text-xs">
                <span className="rounded-full bg-brass/15 px-3 py-1 text-brass">Day</span>
                <Link href="/portal/appointments" className="rounded-full px-3 py-1 text-cream/50 hover:text-cream">Week</Link>
                <Link href="/portal/appointments" className="rounded-full px-3 py-1 text-cream/50 hover:text-cream">Month</Link>
              </div>
            </div>
            <div className="p-scroll mt-4 max-h-[560px] space-y-2 overflow-y-auto pr-1">
              {visible.length === 0 ? (
                <div className="rounded-xl border border-white/8 bg-white/[0.02] p-6 text-center text-sm text-cream/50">No appointments today yet.</div>
              ) : (
                visible.map((a) => {
                  const st = apptState(a);
                  return (
                    <div key={a.id} className="flex items-center gap-3 overflow-hidden rounded-xl border border-white/8 bg-white/[0.02] p-3 transition hover:border-white/15">
                      <span className={`h-9 w-1 shrink-0 rounded-full stbar-${st}`} />
                      <div className="w-16 shrink-0 text-sm font-medium text-cream/80">{fmtTime(a.startTime)}</div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium text-cream">{a.client.name}</div>
                        <div className="truncate text-xs text-cream/45">{a.service.name}{seesAll ? ` · ${a.barber.name}` : ""}</div>
                      </div>
                      {(st === "scheduled" || st === "checkedin") && <QuickAction id={a.id} state={st} />}
                      <span className={`badge shrink-0 ${statusClass(st)}`}>{STATE_LABEL[st]}</span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </section>

        {/* Current client + Next up */}
        <section className="order-1 space-y-5 xl:order-2">
          {current ? (
            <CurrentClientPanel
              id={current.id} clientName={current.client.name} serviceName={current.service.name}
              priceCents={current.collectedCents ?? current.service.priceCents} durationMin={current.service.durationMin}
              startedISO={current.startedAt?.toISOString() ?? null} checkedInISO={current.checkedInAt?.toISOString() ?? null}
              barberName={seesAll ? current.barber.name : null}
            />
          ) : (
            <CurrentClientEmpty />
          )}

          <div className="p-panel p-5">
            <h3 className="font-display text-lg text-cream">Next Up</h3>
            {nextUp ? (
              <div className="mt-3 flex items-center gap-3">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-brass/15 text-sm font-semibold text-brass">{initials(nextUp.client.name)}</span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium text-cream">{nextUp.client.name}</div>
                  <div className="truncate text-xs text-cream/45">{nextUp.service.name}{seesAll ? ` · ${nextUp.barber.name}` : ""}</div>
                </div>
                <div className="text-sm font-medium text-brass">{fmtTime(nextUp.startTime)}</div>
              </div>
            ) : (
              <p className="mt-3 text-sm text-cream/45">Nothing else scheduled.</p>
            )}
          </div>
        </section>

        {/* Right widgets */}
        <section className="order-3 space-y-5 xl:order-3">
          <TimeClock openSinceISO={myClockOpen?.clockIn.toISOString() ?? null} todayMinutes={myClockTodayMin} />

          {/* Live shop status */}
          <div className="p-panel p-5">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-lg text-cream">Live Shop Status</h3>
              <span className="flex items-center gap-1.5 text-xs text-emerald-300"><span className="p-live-dot h-1.5 w-1.5 rounded-full bg-emerald-400" /> Live</span>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <StatMini icon="staff" label="Barbers working" value={seesAll ? barbers.length : 1} />
              <StatMini icon="customers" label="Clients in shop" value={inService.length + waiting.length} />
              <StatMini icon="scissors" label="Chairs in use" value={inService.length} />
              <StatMini icon="booking" label="Remaining" value={notStarted.length} />
            </div>
          </div>

          {/* Check-in queue */}
          <div className="p-panel p-5">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-lg text-cream">Check-In Queue</h3>
              {waiting.length > 0 && <span className="badge st-checkedin">{waiting.length} waiting</span>}
            </div>
            <div className="mt-3 space-y-2">
              {waiting.length === 0 ? (
                <p className="text-sm text-cream/45">No one waiting right now.</p>
              ) : (
                waiting.map((a, i) => {
                  const wait = Math.max(0, Math.round((a.startTime.getTime() - now.getTime()) / 60000));
                  return (
                    <div key={a.id} className="flex items-center gap-3 rounded-xl border border-white/8 bg-white/[0.02] p-2.5">
                      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-brass/15 text-xs font-semibold text-brass">{i + 1}</span>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm text-cream">{a.client.name}</div>
                        <div className="text-xs text-cream/45">Est. {wait} min wait{seesAll ? ` · ${a.barber.name}` : ""}</div>
                      </div>
                      <QuickAction id={a.id} state="checkedin" />
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Recent activity */}
          <div className="p-panel p-5">
            <h3 className="font-display text-lg text-cream">Recent Activity</h3>
            <div className="mt-3 space-y-3">
              {recent.length === 0 ? (
                <p className="text-sm text-cream/45">Nothing yet today.</p>
              ) : (
                recent.map((e, i) => {
                  const EI = Icon[e.icon];
                  return (
                    <div key={i} className="flex items-center gap-3">
                      <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full border border-white/8 bg-white/[0.02] ${e.tone}`}><EI className="h-4 w-4" /></span>
                      <div className="min-w-0 flex-1 truncate text-sm text-cream/75">{e.label}</div>
                      <div className="text-xs text-cream/40">{e.time}</div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </section>
      </div>

      {/* Bottom CTA */}
      <Reveal className="mt-6">
        <div className="p-panel flex flex-wrap items-center justify-between gap-4 overflow-hidden p-6"
          style={{ background: "linear-gradient(100deg, rgba(216,178,92,0.10), rgba(255,255,255,0.02))" }}>
          <div className="flex items-center gap-4">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-[#f4d585] to-[#b98a3c] text-[#17130a]"><Icon.spark className="h-6 w-6" /></span>
            <div>
              <div className="font-display text-lg text-cream">Stay on top of your game</div>
              <div className="text-sm text-cream/55">Keep your clients happy and your schedule tight.</div>
            </div>
          </div>
          <Link href="/portal/appointments" className="p-btn-ghost"><Icon.calendar className="h-4 w-4" /> View Full Calendar</Link>
        </div>
      </Reveal>
    </div>
  );
}

function statusClass(st: ApptState) {
  return { scheduled: "st-scheduled", checkedin: "st-checkedin", inservice: "st-inservice", completed: "st-completed", noshow: "st-noshow", cancelled: "st-cancelled" }[st];
}

function Trend({ n, unit, pct, invert }: { n: number; unit: string; pct?: boolean; invert?: boolean }) {
  const positive = invert ? n < 0 : n > 0;
  const zero = n === 0;
  const cls = zero ? "text-cream/40" : positive ? "text-emerald-300" : "text-red-300";
  const sign = n > 0 ? "+" : "";
  return <span className={cls}>{zero ? "—" : `${sign}${n}${pct ? "%" : ""}`}{!zero ? unit : " no change"}</span>;
}

function StatMini({ icon, label, value }: { icon: IconName; label: string; value: number }) {
  const I = Icon[icon];
  return (
    <div className="rounded-xl border border-white/8 bg-white/[0.02] p-3">
      <span className="grid h-7 w-7 place-items-center rounded-lg bg-brass/[0.08] text-brass"><I className="h-4 w-4" /></span>
      <div className="mt-2 font-display text-xl font-semibold text-cream">{value}</div>
      <div className="text-[11px] text-cream/45">{label}</div>
    </div>
  );
}

function initials(name: string) {
  return name.split(" ").map((n) => n[0]).filter(Boolean).slice(0, 2).join("").toUpperCase() || "C";
}
