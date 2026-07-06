"use client";

import Link from "next/link";
import { useDemo, serviceById, customerById, staffById, openTimeEntry } from "@/lib/demo/store";
import { useToast } from "@/components/demo/toast";
import { KPI, Panel, SectionTitle, Money, StatusBadge, Avatar, Btn, Tag } from "@/components/demo/ui";
import { Icon } from "@/components/home/icons";
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
    <>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl text-cream sm:text-3xl">Hey {me.name.split(" ")[0]} 👋</h1>
          <p className="mt-1 text-sm text-cream/50">{mine.length} on your chair today · {new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}</p>
        </div>
        {open ? (
          <div className="flex items-center gap-3 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-4 py-2">
            <span className="p-live-dot h-2 w-2 rounded-full bg-emerald-400" />
            <span className="text-sm text-emerald-100">Clocked in · {clockLabel}</span>
            <Btn onClick={() => { actions.clockOut(open.id); toast("Clocked out"); }}>Clock out</Btn>
          </div>
        ) : (
          <Btn variant="gold" onClick={() => { actions.clockIn(me.id); toast("Clocked in"); }}><Icon.clock className="h-4 w-4" /> Clock in</Btn>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KPI label="Appointments" value={mine.length} icon="calendar" hint="On your chair today" />
        <KPI label="Earnings today" value={<Money cents={revenueToday(state, me.id)} />} icon="dollar" hint="Service + tips" accent="#34d399" />
        <KPI label="Tips (all time)" value={<Money cents={totalTips(state, me.id)} />} icon="loyalty" hint="Total collected" accent="#f472b6" />
        <KPI label="Commission" value={<Money cents={comm.commissionCents} />} icon="growth" hint={`At ${me.commissionRate}%`} accent="#38bdf8" />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Panel className="lg:col-span-2">
          <SectionTitle right={<Link href="/demo/barber/calendar" className="text-xs font-semibold text-brass hover:underline">Calendar →</Link>}>Today&apos;s chair</SectionTitle>
          {mine.length === 0 ? (
            <p className="py-6 text-center text-sm text-cream/40">No appointments booked today.</p>
          ) : (
            <ul className="divide-y divide-white/6">
              {mine.map((a) => {
                const svc = serviceById(state, a.serviceId);
                const cust = customerById(state, a.customerId);
                const t = new Date(a.startISO);
                return (
                  <li key={a.id} className="flex items-center gap-3 py-2.5">
                    <span className="w-16 text-sm font-medium text-cream/80">{minutesToLabel(t.getHours() * 60 + t.getMinutes())}</span>
                    <Avatar name={cust?.name ?? "?"} color={me.color} size={32} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm text-cream">{cust?.name}</div>
                      <div className="truncate text-xs text-cream/45">{svc?.name} · {svc?.durationMin}m · {formatMoney(svc?.priceCents ?? 0)}</div>
                    </div>
                    {a.status === "completed" ? <StatusBadge status={a.status} /> : (
                      <div className="flex gap-1.5">
                        {a.status !== "checked_in" && a.status !== "in_service" && <Btn onClick={() => actions.setApptStatus(a.id, "checked_in")}>Check in</Btn>}
                        <Link href="/demo/barber/checkout" className="p-btn-gold !py-1.5 text-xs">Checkout</Link>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>

        <div className="space-y-4">
          <Panel>
            <SectionTitle>Up next</SectionTitle>
            {next ? (() => {
              const svc = serviceById(state, next.serviceId);
              const cust = customerById(state, next.customerId);
              return (
                <div className="text-center">
                  <Avatar name={cust?.name ?? "?"} color={me.color} size={56} />
                  <div className="mt-2 font-display text-lg text-cream">{cust?.name}</div>
                  <div className="text-sm text-cream/50">{svc?.name}</div>
                  <div className="mt-1 text-brass">{new Date(next.startISO).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}</div>
                  {cust?.notes && <p className="mt-3 rounded-lg border border-white/8 bg-white/[0.02] p-2 text-left text-xs text-cream/60">📝 {cust.notes}</p>}
                </div>
              );
            })() : <p className="text-sm text-cream/40">You&apos;re all caught up.</p>}
          </Panel>
          <Panel>
            <SectionTitle>This period</SectionTitle>
            <div className="space-y-2 text-sm">
              <Row label="Service revenue" value={formatMoney(comm.serviceCents)} />
              <Row label={`Commission (${me.commissionRate}%)`} value={formatMoney(comm.commissionCents)} />
              <Row label="Tips" value={formatMoney(comm.tipsCents)} />
              <div className="my-1 h-px bg-white/8" />
              <Row label="Take-home" value={formatMoney(comm.commissionCents + comm.tipsCents)} strong />
            </div>
            <div className="mt-3 flex items-center gap-1.5 text-sm text-cream/60"><Icon.star className="h-4 w-4 text-brass" /> 4.9 rating · <Tag tone="gold">Top barber</Tag></div>
          </Panel>
        </div>
      </div>
    </>
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
