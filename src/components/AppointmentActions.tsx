"use client";

import { useEffect, useState, useTransition } from "react";
import {
  setAppointmentStatus, rescheduleAppointment, cancelAppointment, deleteAppointment, reopenAppointment,
} from "@/app/portal/actions";
import { RESCHEDULE_REASONS, CANCEL_REASONS, DELETE_REASONS } from "@/lib/appointmentReasons";

type Slot = { start: string; end: string };
type Day = { date: string; slots: Slot[] };
type Modal = null | "reschedule" | "cancel" | "delete";

export function AppointmentActions({
  id, startISO, slug, serviceId, barberId, status,
}: {
  id: string; startISO: string; slug: string; serviceId: string; barberId: string; status: string;
}) {
  const [modal, setModal] = useState<Modal>(null);
  const [pending, start] = useTransition();

  const run = (fn: () => Promise<void>) => start(async () => { await fn(); setModal(null); });

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {status === "CONFIRMED" ? (
        <>
          <ActionBtn onClick={() => run(() => setAppointmentStatus(id, "COMPLETED"))} tone="good">Done</ActionBtn>
          <ActionBtn onClick={() => setModal("reschedule")}>Reschedule</ActionBtn>
          <ActionBtn onClick={() => setModal("cancel")} tone="warn">Cancel</ActionBtn>
        </>
      ) : (
        <ActionBtn onClick={() => run(() => reopenAppointment(id))} title="Undo — set back to confirmed">↩ Undo</ActionBtn>
      )}
      <ActionBtn onClick={() => setModal("delete")} tone="bad" title="Delete">🗑</ActionBtn>

      {modal === "reschedule" && (
        <RescheduleModal id={id} slug={slug} serviceId={serviceId} barberId={barberId} pending={pending}
          onClose={() => setModal(null)}
          onConfirm={(startTime, reason) => run(() => rescheduleAppointment(id, startTime, reason))} />
      )}
      {modal === "cancel" && (
        <ReasonModal title="Cancel appointment"
          hint="Pick a reason. Choosing “No show” marks it as a no-show."
          reasons={[...CANCEL_REASONS]} confirmLabel="Confirm cancel" tone="bad" pending={pending}
          onClose={() => setModal(null)} onConfirm={(reason) => run(() => cancelAppointment(id, reason))} />
      )}
      {modal === "delete" && (
        <ReasonModal title="Delete appointment"
          hint="This permanently removes the appointment. Pick a reason for the record."
          reasons={[...DELETE_REASONS]} confirmLabel="Delete" tone="bad" pending={pending}
          onClose={() => setModal(null)} onConfirm={(reason) => run(() => deleteAppointment(id, reason))} />
      )}
    </div>
  );
}

function ActionBtn({ children, onClick, tone, title }: {
  children: React.ReactNode; onClick: () => void; tone?: "good" | "warn" | "bad"; title?: string;
}) {
  const tones: Record<string, string> = {
    good: "bg-emerald-500/15 text-emerald-200 hover:bg-emerald-500/25",
    warn: "bg-amber-500/15 text-amber-200 hover:bg-amber-500/25",
    bad: "bg-red-500/15 text-red-200 hover:bg-red-500/25",
    default: "bg-white/5 text-cream/80 hover:bg-white/10",
  };
  return (
    <button type="button" onClick={onClick} title={title}
      className={`rounded-md px-2.5 py-1 text-xs font-medium transition ${tones[tone ?? "default"]}`}>
      {children}
    </button>
  );
}

function Modal({ title, hint, children, onClose }: {
  title: string; hint?: string; children: React.ReactNode; onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-charcoal p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-4">
          <h3 className="font-display text-xl">{title}</h3>
          <button onClick={onClose} className="text-cream/40 hover:text-cream">✕</button>
        </div>
        {hint && <p className="mt-1 text-sm text-cream/50">{hint}</p>}
        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
}

function ReasonChips({ reasons, value, onChange }: { reasons: string[]; value: string | null; onChange: (r: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {reasons.map((r) => {
        const active = value === r;
        return (
          <button key={r} type="button" onClick={() => onChange(r)}
            className="rounded-full border px-3 py-1.5 text-sm transition"
            style={active
              ? { background: "var(--brand)", color: "var(--brand-fg)", borderColor: "var(--brand)" }
              : { borderColor: "rgba(255,255,255,0.15)" }}>
            {r}
          </button>
        );
      })}
    </div>
  );
}

function ReasonModal({ title, hint, reasons, confirmLabel, tone, pending, onClose, onConfirm }: {
  title: string; hint: string; reasons: string[]; confirmLabel: string; tone: "bad";
  pending: boolean; onClose: () => void; onConfirm: (reason: string) => void;
}) {
  const [reason, setReason] = useState<string | null>(null);
  return (
    <Modal title={title} hint={hint} onClose={onClose}>
      <ReasonChips reasons={reasons} value={reason} onChange={setReason} />
      <div className="mt-6 flex justify-end gap-2">
        <button onClick={onClose} className="btn-ghost px-4 py-2 text-sm">Keep it</button>
        <button disabled={!reason || pending} onClick={() => reason && onConfirm(reason)}
          className="rounded-full bg-red-500 px-5 py-2 text-sm font-semibold text-white transition hover:bg-red-600 disabled:opacity-40">
          {pending ? "Working…" : confirmLabel}
        </button>
      </div>
    </Modal>
  );
}

function RescheduleModal({ id, slug, serviceId, barberId, pending, onClose, onConfirm }: {
  id: string; slug: string; serviceId: string; barberId: string; pending: boolean;
  onClose: () => void; onConfirm: (startISO: string, reason: string) => void;
}) {
  const [days, setDays] = useState<Day[] | null>(null);
  const [dayIdx, setDayIdx] = useState(0);
  const [slotStart, setSlotStart] = useState<string | null>(null);
  const [reason, setReason] = useState<string | null>(null);

  useEffect(() => {
    const qs = new URLSearchParams({ serviceId, barberId });
    fetch(`/api/t/${slug}/availability?${qs}`)
      .then((r) => r.json())
      .then((d) => setDays(d.days ?? []))
      .catch(() => setDays([]));
  }, [slug, serviceId, barberId]);

  const slots = days?.[dayIdx]?.slots ?? [];

  return (
    <Modal title="Reschedule appointment" hint="Pick a new date, time, and a reason." onClose={onClose}>
      {days === null ? (
        <p className="text-sm text-cream/50">Loading available times…</p>
      ) : days.length === 0 ? (
        <p className="text-sm text-cream/50">No open times in the next few weeks for this barber.</p>
      ) : (
        <div className="space-y-4">
          <div>
            <div className="label">New date</div>
            <select className="input" value={dayIdx}
              onChange={(e) => { setDayIdx(Number(e.target.value)); setSlotStart(null); }}>
              {days.map((d, i) => (
                <option key={d.date} value={i}>
                  {new Date(d.date).toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })}
                </option>
              ))}
            </select>
          </div>
          <div>
            <div className="label">New time</div>
            <div className="grid max-h-40 grid-cols-3 gap-2 overflow-y-auto sm:grid-cols-4">
              {slots.map((s) => {
                const active = slotStart === s.start;
                return (
                  <button key={s.start} type="button" onClick={() => setSlotStart(s.start)}
                    className="rounded-lg border px-2 py-2 text-sm transition"
                    style={active
                      ? { background: "var(--brand)", color: "var(--brand-fg)", borderColor: "var(--brand)" }
                      : { borderColor: "rgba(255,255,255,0.12)" }}>
                    {new Date(s.start).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <div className="label">Reason</div>
            <ReasonChips reasons={[...RESCHEDULE_REASONS]} value={reason} onChange={setReason} />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button onClick={onClose} className="btn-ghost px-4 py-2 text-sm">Cancel</button>
            <button disabled={!slotStart || !reason || pending}
              onClick={() => slotStart && reason && onConfirm(slotStart, reason)}
              className="btn-primary px-5 py-2 text-sm disabled:opacity-40">
              {pending ? "Saving…" : "Reschedule"}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
