"use client";

import Link from "next/link";
import { useDemo, serviceById, customerById, staffById, openTimeEntry } from "@/lib/demo/store";
import { useToast } from "@/components/demo/toast";
import { Panel, Money, StatusBadge, Avatar, Btn, Tag, cx } from "@/components/demo/ui";
import { Icon, type IconName } from "@/components/home/icons";
import { formatMoney, minutesToLabel } from "@/lib/utils";
import { todayAppts, revenueToday, totalTips, commissionOf } from "@/lib/demo/metrics";

export default function BarberToday() {
  const { state, actions } = useDemo();
  const { toast } = useToast();
  const me = staffById(state, state.currentStaffId)!;
  const mine = todayAppts(state, me.id);
  const open = openTimeEntry(state, me.id);
  const comm = commissionOf(state, me.id);
  const next = mine.find((a) => ["scheduled", "confirmed", "checked_in"].includes(a.status));
  const clockLabel = open ? new Date(open.clockInISO).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" }) : null;

  return (
    <div className="mx-auto max-w-2xl space-y-5 lg:max-w-none">
      {/* Greeting */}
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="font-display text-2xl leading-tight text-cream sm:text-3xl">Hey {me.name.split(" ")[0]}</h1>
          <p className="mt-0.5 text-[13px] text-cream/45">{new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}</p>
        </div>
        <Avatar name={me.name} color={me.color} size={44} />
      </div>

      {/* Clock status — the day's primary action */}
      {open ? (
        <div className="relative overflow-hidden rounded-3xl border border-emerald-400/25 bg-gradient-to-br from-emerald-400/[0.12] via-transparent to-transparent p-5">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-emerald-300">
                <span className="p-live-dot h-2 w-2 rounded-full bg-emerald-400" />
                <span className="text-xs font-semibold uppercase tracking-[0.15em]">On shift</span>
              </div>
              <div className="mt-1.5 font-display text-2xl text-cream">Since {clockLabel}</div>
            </div>
            <button onClick={() => { actions.clockOut(open.id); toast("Clocked out"); }} className="p-btn-ghost shrink-0">Clock out</button>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-4 rounded-3xl border border-white/8 bg-white/[0.02] p-5">
          <div className="min-w-0">
            <div className="text-xs font-semibold uppercase tracking-[0.15em] text-cream/40">Time clock</div>
            <div className="mt-1 font-display text-xl text-cream">Start your shift</div>
          </div>
          <button onClick={() => { actions.clockIn(me.id); toast("Clocked in"); }} className="p-btn-gold shrink-0"><Icon.clock className="h-4 w-4" /> Clock in</button>
        </div>
      )}

      {/* Earnings hero + stat row */}
      <div className="space-y-3">
        <div className="relative overflow-hidden rounded-3xl border border-brass/25 bg-gradient-to-br from-brass/[0.12] via-white/[0.02] to-transparent p-5">
          <div aria-hidden className="pointer-events-none absolute -right-8 -top-10 h-32 w-32 rounded-full bg-brass/10 blur-2xl" />
          <div className="relative">
            <div className="text-xs font-semibold uppercase tracking-[0.15em] text-brass/80">Earnings today</div>
            <div className="mt-1 font-display text-4xl text-cream"><Money cents={revenueToday(state, me.id)} /></div>
            <div className="mt-0.5 text-xs text-cream/45">Service + tips on your chair</div>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <StatTile label="Clients" value={String(mine.length)} icon="calendar" />
          <StatTile label="Tips" value={formatMoney(totalTips(state, me.id))} icon="loyalty" accent="#f472b6" />
          <StatTile label="Commission" value={formatMoney(comm.commissionCents)} sub={`${me.commissionRate}%`} icon="growth" accent="#38bdf8" />
        </div>
      </div>

      {/* Chair + sidebar */}
      <div className="grid gap-5 lg:grid-cols-3">
        <div className="min-w-0 space-y-3 lg:col-span-2">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-cream/60">Today&apos;s chair</h2>
            <Link href="/demo/barber/calendar" className="text-xs font-semibold text-brass hover:underline">Calendar →</Link>
          </div>
          {mine.length === 0 ? (
            <Panel className="py-10 text-center text-sm text-cream/40">No appointments booked today.</Panel>
          ) : (
            <div className="space-y-2.5">
              {mine.map((a) => {
                const svc = serviceById(state, a.serviceId);
                const cust = customerById(state, a.customerId);
                const t = new Date(a.startISO);
                const done = a.status === "completed";
                return (
                  <div key={a.id} className={cx("relative flex items-center gap-3 overflow-hidden rounded-2xl border border-white/8 bg-white/[0.02] p-3 pl-4", done && "opacity-70")}>
                    <span className={cx("absolute inset-y-0 left-0 w-1", `stbar-${a.status === "in_service" ? "inservice" : a.status === "checked_in" ? "checkedin" : done ? "completed" : "scheduled"}`)} />
                    <div className="grid shrink-0 place-items-center rounded-xl border border-brass/20 bg-brass/[0.06] px-2.5 py-1.5 text-center">
                      <span className="text-sm font-semibold leading-none text-brass">{minutesToLabel(t.getHours() * 60 + t.getMinutes())}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium text-cream">{cust?.name}</div>
                      <div className="truncate text-xs text-cream/45">{svc?.name} · {formatMoney(svc?.priceCents ?? 0)}</div>
                    </div>
                    {done ? (
                      <StatusBadge status={a.status} />
                    ) : (
                      <div className="flex shrink-0 items-center gap-1.5">
                        {a.status !== "checked_in" && a.status !== "in_service" && (
                          <button onClick={() => actions.setApptStatus(a.id, "checked_in")} className="rounded-full border border-white/12 px-3 py-1.5 text-xs text-cream/70 transition hover:border-brass/40">Check in</button>
                        )}
                        <Link href="/demo/barber/checkout" className="p-btn-gold !px-3.5 !py-1.5 text-xs">Checkout</Link>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="min-w-0 space-y-3">
          <Panel>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-[0.14em] text-cream/60">Up next</h2>
            {next ? (() => {
              const svc = serviceById(state, next.serviceId);
              const cust = customerById(state, next.customerId);
              return (
                <div className="text-center">
                  <div className="mx-auto"><Avatar name={cust?.name ?? "?"} color={me.color} size={60} /></div>
                  <div className="mt-2.5 font-display text-lg text-cream">{cust?.name}</div>
                  <div className="text-sm text-cream/50">{svc?.name}</div>
                  <div className="mt-1.5 inline-block rounded-full bg-brass/12 px-3 py-1 text-sm font-semibold text-brass">{new Date(next.startISO).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}</div>
                  {cust?.notes && <p className="mt-3 rounded-xl border border-white/8 bg-white/[0.02] p-2.5 text-left text-xs text-cream/60">📝 {cust.notes}</p>}
                </div>
              );
            })() : <p className="py-4 text-center text-sm text-cream/40">You&apos;re all caught up.</p>}
          </Panel>
          <Panel>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-[0.14em] text-cream/60">This period</h2>
            <div className="space-y-2 text-sm">
              <Row label="Service revenue" value={formatMoney(comm.serviceCents)} />
              <Row label={`Commission (${me.commissionRate}%)`} value={formatMoney(comm.commissionCents)} />
              <Row label="Tips" value={formatMoney(comm.tipsCents)} />
              <div className="p-hairline my-1.5" />
              <Row label="Take-home" value={formatMoney(comm.commissionCents + comm.tipsCents)} strong />
            </div>
            <div className="mt-3 flex items-center gap-1.5 text-sm text-cream/60"><Icon.star className="h-4 w-4 text-brass" /> 4.9 rating <Tag tone="gold">Top barber</Tag></div>
          </Panel>
        </div>
      </div>
    </div>
  );
}

function StatTile({ label, value, sub, icon, accent = "#d8b25c" }: { label: string; value: string; sub?: string; icon: IconName; accent?: string }) {
  const I = Icon[icon];
  return (
    <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-3">
      <span className="grid h-7 w-7 place-items-center rounded-lg" style={{ background: `${accent}1f`, color: accent }}><I className="h-4 w-4" /></span>
      <div className="mt-2 truncate text-base font-semibold text-cream">{value}</div>
      <div className="truncate text-[11px] text-cream/45">{label}{sub ? ` · ${sub}` : ""}</div>
    </div>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-cream/55">{label}</span>
      <span className={strong ? "font-semibold text-brass" : "text-cream"}>{value}</span>
    </div>
  );
}
