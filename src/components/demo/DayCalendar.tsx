"use client";

import { useMemo, useRef, useState } from "react";
import { Icon } from "@/components/home/icons";
import { minutesToLabel, formatMoney, classNames as cx } from "@/lib/utils";
import { useDemo, staffById, serviceById, customerById } from "@/lib/demo/store";
import { useToast } from "@/components/demo/toast";
import { Avatar, Btn, Field, Modal, StatusBadge, statusMeta } from "@/components/demo/ui";
import { startOfDay, addDays, sameDay } from "@/lib/demo/metrics";
import type { Appointment, ApptStatus, PaymentMethod } from "@/lib/demo/types";

const DAY_START = 9 * 60; // 9:00
const DAY_END = 20 * 60;  // 20:00
const SLOT = 30;          // minutes per row
const SLOT_H = 46;        // px per slot
const SLOTS = (DAY_END - DAY_START) / SLOT;

const toMin = (iso: string) => { const d = new Date(iso); return d.getHours() * 60 + d.getMinutes(); };
const isoAt = (day: Date, minutes: number) => {
  const d = startOfDay(day);
  d.setMinutes(minutes);
  return d.toISOString();
};
// Local (not UTC) yyyy-mm-dd for <input type="date">, and back to an ISO instant.
const toYmd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const fromYmdMin = (ymd: string, minutes: number) => {
  const [y, mo, d] = ymd.split("-").map(Number);
  const dt = new Date(y, (mo ?? 1) - 1, d ?? 1, 0, 0, 0, 0);
  dt.setMinutes(minutes);
  return dt.toISOString();
};

export function DayCalendar({ singleStaffId }: { singleStaffId?: string }) {
  const { state, actions } = useDemo();
  const { toast } = useToast();
  const [day, setDay] = useState(() => startOfDay(new Date()));
  const [dragId, setDragId] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [creating, setCreating] = useState<{ staffId: string; minutes: number } | null>(null);

  const single = Boolean(singleStaffId);
  const columns = useMemo(() => {
    if (singleStaffId) return state.staff.filter((s) => s.id === singleStaffId);
    return state.staff.filter((s) => s.active && s.level !== "Owner");
  }, [state.staff, singleStaffId]);

  const dayAppts = state.appointments.filter((a) => sameDay(new Date(a.startISO), day) && a.status !== "cancelled");

  const drop = (staffId: string, clientY: number, colTop: number) => {
    if (!dragId) return;
    const y = clientY - colTop;
    const slot = Math.max(0, Math.min(SLOTS - 1, Math.round(y / SLOT_H)));
    const minutes = DAY_START + slot * SLOT;
    actions.moveAppointment(dragId, isoAt(day, minutes), staffId);
    setDragId(null);
    toast("Appointment moved");
  };

  const detail = detailId ? state.appointments.find((a) => a.id === detailId) ?? null : null;

  return (
    <div>
      {/* Toolbar */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button onClick={() => setDay((d) => addDays(d, -1))} className="grid h-9 w-9 place-items-center rounded-full border border-white/10 text-cream/70 hover:text-brass"><Icon.chevron className="h-4 w-4" /></button>
          <button onClick={() => setDay(startOfDay(new Date()))} className="p-btn-ghost !py-1.5 text-xs">Today</button>
          <button onClick={() => setDay((d) => addDays(d, 1))} className="grid h-9 w-9 place-items-center rounded-full border border-white/10 text-cream/70 hover:text-brass"><Icon.chevron className="h-4 w-4 rotate-180" /></button>
          <span className="ml-2 font-display text-lg text-cream">
            {day.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
            {sameDay(day, new Date()) && <span className="ml-2 rounded-full bg-brass/15 px-2 py-0.5 align-middle text-[11px] font-semibold text-brass">Today</span>}
          </span>
        </div>
        <Btn variant="gold" onClick={() => setCreating({ staffId: columns[0]?.id ?? state.staff[0].id, minutes: 600 })}>
          <Icon.plus className="h-4 w-4" /> New appointment
        </Btn>
      </div>

      {/* Grid. A single barber's own day fits the screen (no sideways scroll);
          the multi-barber admin view keeps a min width and scrolls in-panel. */}
      <div className={cx("p-panel p-scroll", single ? "overflow-x-hidden" : "overflow-x-auto")}>
        <div className={cx("flex", single ? "min-w-0" : "min-w-[640px]")}>
          {/* time gutter */}
          <div className="w-14 shrink-0 pt-10">
            {Array.from({ length: SLOTS }).map((_, i) => (
              <div key={i} style={{ height: SLOT_H }} className="relative">
                {i % 2 === 0 && <span className="absolute -top-2 right-2 text-[10px] text-cream/35">{minutesToLabel(DAY_START + i * SLOT)}</span>}
              </div>
            ))}
          </div>

          {/* columns */}
          <div className="flex flex-1">
            {columns.map((st) => (
              <StaffColumn
                key={st.id}
                staff={st}
                appts={dayAppts.filter((a) => a.staffId === st.id)}
                onDragStart={setDragId}
                onDrop={drop}
                onOpen={setDetailId}
                onEmptyClick={(minutes) => setCreating({ staffId: st.id, minutes })}
                stateResolver={{
                  service: (id: string) => serviceById(state, id),
                  customer: (id: string) => customerById(state, id),
                }}
              />
            ))}
          </div>
        </div>
      </div>

      {creating && <CreateModal init={creating} onClose={() => setCreating(null)} day={day} />}
      {detail && <DetailModal appt={detail} onClose={() => setDetailId(null)} />}
    </div>
  );
}

function StaffColumn({
  staff, appts, onDragStart, onDrop, onOpen, onEmptyClick, stateResolver,
}: {
  staff: { id: string; name: string; color: string };
  appts: Appointment[];
  onDragStart: (id: string) => void;
  onDrop: (staffId: string, clientY: number, colTop: number) => void;
  onOpen: (id: string) => void;
  onEmptyClick: (minutes: number) => void;
  stateResolver: { service: (id: string) => { name: string; durationMin: number } | undefined; customer: (id: string) => { name: string } | undefined };
}) {
  const ref = useRef<HTMLDivElement>(null);
  return (
    <div className="min-w-0 flex-1 border-l border-white/6">
      <div className="flex h-10 items-center gap-1.5 border-b border-white/8 px-2">
        <Avatar name={staff.name} color={staff.color} size={20} />
        <span className="truncate text-xs font-medium text-cream/80">{staff.name.split(" ")[0]}</span>
      </div>
      <div
        ref={ref}
        className="relative"
        style={{ height: SLOTS * SLOT_H }}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => { const r = ref.current?.getBoundingClientRect(); if (r) onDrop(staff.id, e.clientY, r.top); }}
      >
        {/* slot lines + click-to-create */}
        {Array.from({ length: SLOTS }).map((_, i) => (
          <div
            key={i}
            style={{ height: SLOT_H }}
            className="group border-b border-white/5 transition hover:bg-white/[0.02]"
            onClick={() => onEmptyClick(DAY_START + i * SLOT)}
          >
            <span className="pointer-events-none flex h-full items-center justify-center text-[10px] text-transparent group-hover:text-cream/25">+ add</span>
          </div>
        ))}
        {/* appointments */}
        {appts.map((a) => {
          const svc = stateResolver.service(a.serviceId);
          const cust = stateResolver.customer(a.customerId);
          const start = toMin(a.startISO);
          const dur = svc?.durationMin ?? 30;
          const top = ((start - DAY_START) / SLOT) * SLOT_H;
          const height = Math.max(28, (dur / SLOT) * SLOT_H - 3);
          const m = statusMeta(a.status);
          return (
            <button
              key={a.id}
              draggable
              onDragStart={() => onDragStart(a.id)}
              onClick={(e) => { e.stopPropagation(); onOpen(a.id); }}
              style={{ top: top + 1, height, borderLeftColor: staff.color }}
              className="absolute left-1 right-1 cursor-grab overflow-hidden rounded-lg border border-white/10 border-l-[3px] bg-[#17151b] p-1.5 text-left shadow-sm transition hover:border-brass/40 active:cursor-grabbing"
            >
              <div className="truncate text-xs font-semibold text-cream">{cust?.name ?? "Guest"}</div>
              <div className="truncate text-[11px] text-cream/50">{svc?.name}</div>
              <span className={cx("mt-0.5 inline-block rounded px-1 py-px text-[9px]", m.cls)}>{m.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function CreateModal({ init, day, onClose }: { init: { staffId: string; minutes: number }; day: Date; onClose: () => void }) {
  const { state, actions } = useDemo();
  const { toast } = useToast();
  const [customerId, setCustomerId] = useState(state.customers[0]?.id ?? "");
  const [serviceId, setServiceId] = useState(state.services.find((s) => s.active)?.id ?? state.services[0].id);
  const [staffId, setStaffId] = useState(init.staffId);
  const [time, setTime] = useState(init.minutes);

  const save = () => {
    const svc = serviceById(state, serviceId)!;
    const start = isoAt(day, time);
    actions.addAppointment({
      customerId, staffId, serviceId,
      startISO: start,
      endISO: new Date(new Date(start).getTime() + svc.durationMin * 60000).toISOString(),
      status: "scheduled", priceCents: svc.priceCents, tipCents: 0, paymentMethod: null, notes: "",
    });
    toast("Appointment booked");
    onClose();
  };

  const times: number[] = [];
  for (let m = DAY_START; m < DAY_END; m += SLOT) times.push(m);

  return (
    <Modal open onClose={onClose} title="New appointment"
      footer={<><Btn onClick={onClose}>Cancel</Btn><Btn variant="gold" onClick={save}>Book appointment</Btn></>}>
      <div className="space-y-4">
        <Field label="Customer">
          <select className="input" value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
            {state.customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </Field>
        <Field label="Service">
          <select className="input" value={serviceId} onChange={(e) => setServiceId(e.target.value)}>
            {state.services.filter((s) => s.active).map((s) => <option key={s.id} value={s.id}>{s.name} · {formatMoney(s.priceCents)} · {s.durationMin}m</option>)}
          </select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Barber">
            <select className="input" value={staffId} onChange={(e) => setStaffId(e.target.value)}>
              {state.staff.filter((s) => s.active && s.level !== "Owner").map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </Field>
          <Field label="Time">
            <select className="input" value={time} onChange={(e) => setTime(Number(e.target.value))}>
              {times.map((m) => <option key={m} value={m}>{minutesToLabel(m)}</option>)}
            </select>
          </Field>
        </div>
      </div>
    </Modal>
  );
}

function DetailModal({ appt, onClose }: { appt: Appointment; onClose: () => void }) {
  const { state, actions } = useDemo();
  const { toast } = useToast();
  const svc = serviceById(state, appt.serviceId);
  const cust = customerById(state, appt.customerId);
  const staff = staffById(state, appt.staffId);
  const [tip, setTip] = useState(Math.round((svc?.priceCents ?? 0) * 0.18));
  const [method, setMethod] = useState<PaymentMethod>("card");
  const [checkingOut, setCheckingOut] = useState(false);

  const startD = new Date(appt.startISO);
  const [rDate, setRDate] = useState(() => toYmd(startD));
  const [rMin, setRMin] = useState(() => startD.getHours() * 60 + startD.getMinutes());
  const rescheduleTimes: number[] = [];
  for (let m = DAY_START; m < DAY_END; m += SLOT) rescheduleTimes.push(m);
  const reschedule = (dateStr: string, minutes: number) => {
    setRDate(dateStr); setRMin(minutes);
    actions.moveAppointment(appt.id, fromYmdMin(dateStr, minutes), appt.staffId);
    toast("Appointment rescheduled");
  };

  const setStatus = (s: ApptStatus, label: string) => { actions.setApptStatus(appt.id, s); toast(label); };

  return (
    <Modal open onClose={onClose} title={cust?.name ?? "Appointment"}
      footer={<Btn onClick={onClose}>Close</Btn>}>
      <div className="space-y-4">
        <div className="flex items-center justify-between rounded-xl border border-white/8 bg-white/[0.02] p-3">
          <div>
            <div className="text-sm text-cream">{svc?.name} · {formatMoney(svc?.priceCents ?? 0)}</div>
            <div className="text-xs text-cream/50">{new Date(appt.startISO).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })} with {staff?.name}</div>
          </div>
          <StatusBadge status={appt.status} />
        </div>

        {cust?.notes && (
          <div className="rounded-xl border border-white/8 bg-white/[0.02] p-3 text-left text-xs text-cream/70">
            <span className="mr-1">📝</span>{cust.notes}
          </div>
        )}

        {!checkingOut ? (
          <>
            <div className="grid grid-cols-2 gap-2">
              <Btn onClick={() => setStatus("checked_in", "Checked in")}>Check in</Btn>
              <Btn onClick={() => setStatus("in_service", "Started service")}>Start service</Btn>
              <Btn onClick={() => setStatus("no_show", "Marked no-show")}>No show</Btn>
              <Btn variant="danger" onClick={() => { actions.setApptStatus(appt.id, "cancelled"); toast("Appointment cancelled"); onClose(); }}>Cancel</Btn>
            </div>

            {/* Quick reschedule — change time/date without dragging (works on phones). */}
            <Field label="Reschedule">
              <div className="grid grid-cols-2 gap-2">
                <input type="date" value={rDate} onChange={(e) => reschedule(e.target.value, rMin)} className="input" />
                <select className="input" value={rMin} onChange={(e) => reschedule(rDate, Number(e.target.value))}>
                  {rescheduleTimes.map((m) => <option key={m} value={m}>{minutesToLabel(m)}</option>)}
                </select>
              </div>
            </Field>

            <Btn variant="gold" className="w-full" onClick={() => setCheckingOut(true)}>Complete & checkout</Btn>
          </>
        ) : (
          <div className="space-y-3 rounded-xl border border-brass/20 bg-brass/[0.05] p-3">
            <div className="text-sm font-medium text-cream">Checkout</div>
            <Field label="Tip">
              <div className="flex gap-2">
                {[0.15, 0.18, 0.2, 0.25].map((p) => (
                  <button key={p} onClick={() => setTip(Math.round((svc?.priceCents ?? 0) * p))}
                    className={cx("flex-1 rounded-lg border py-1.5 text-xs", tip === Math.round((svc?.priceCents ?? 0) * p) ? "border-brass bg-brass/15 text-brass" : "border-white/10 text-cream/60")}>
                    {Math.round(p * 100)}%
                  </button>
                ))}
              </div>
            </Field>
            <Field label="Payment method">
              <select className="input" value={method} onChange={(e) => setMethod(e.target.value as PaymentMethod)}>
                <option value="card">Card</option><option value="cash">Cash</option><option value="wallet">Digital wallet</option>
              </select>
            </Field>
            <div className="flex items-center justify-between text-sm">
              <span className="text-cream/60">Total</span>
              <span className="font-semibold text-cream">{formatMoney((svc?.priceCents ?? 0) + tip)}</span>
            </div>
            <Btn variant="gold" className="w-full" onClick={() => { actions.checkout(appt.id, tip, method); toast("Checked out — payment simulated"); onClose(); }}>
              Take payment
            </Btn>
          </div>
        )}
      </div>
    </Modal>
  );
}
