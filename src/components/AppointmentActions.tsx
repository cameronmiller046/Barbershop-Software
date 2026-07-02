"use client";

import { useEffect, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import {
  rescheduleAppointment, cancelAppointment, deleteAppointment, reopenAppointment,
  startAppointment, finishAppointment, correctAppointmentClock,
} from "@/app/portal/actions";
import { RESCHEDULE_REASONS, CANCEL_REASONS, DELETE_REASONS } from "@/lib/appointmentReasons";

type Slot = { start: string; end: string };
type Day = { date: string; slots: Slot[] };
type Modal = null | "reschedule" | "cancel" | "delete" | "clock" | "collect";

export function AppointmentActions({
  id, slug, serviceId, barberId, status, startedISO, finishedISO, canCorrect, servicePriceCents,
}: {
  id: string; slug: string; serviceId: string; barberId: string; status: string;
  startedISO?: string | null; finishedISO?: string | null; canCorrect?: boolean; servicePriceCents?: number;
}) {
  const [modal, setModal] = useState<Modal>(null);
  const [pending, startT] = useTransition();
  const run = (fn: () => Promise<void>) => startT(async () => { await fn(); setModal(null); });

  const running = status === "CONFIRMED" && !!startedISO && !finishedISO;
  const turnaround = startedISO && finishedISO
    ? Math.round((new Date(finishedISO).getTime() - new Date(startedISO).getTime()) / 60000)
    : null;

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {turnaround != null && (
        <span className="rounded-md bg-white/5 px-2 py-1 text-xs text-cream/70" title="Turnaround time">⏱ {turnaround}m</span>
      )}

      {status === "CONFIRMED" && !finishedISO ? (
        running ? (
          <>
            <Elapsed startISO={startedISO!} />
            <ActionBtn onClick={() => setModal("collect")} tone="good">✓ Check out</ActionBtn>
            <ActionBtn onClick={() => setModal("reschedule")}>Reschedule</ActionBtn>
            <ActionBtn onClick={() => setModal("cancel")} tone="warn">Cancel</ActionBtn>
          </>
        ) : (
          <>
            <ActionBtn onClick={() => run(() => startAppointment(id))} tone="good">▶ Check in</ActionBtn>
            <ActionBtn onClick={() => setModal("collect")}>✓ Complete</ActionBtn>
            <ActionBtn onClick={() => setModal("reschedule")}>Reschedule</ActionBtn>
            <ActionBtn onClick={() => setModal("cancel")} tone="warn">Cancel</ActionBtn>
          </>
        )
      ) : (
        <ActionBtn onClick={() => run(() => reopenAppointment(id))} title="Undo — set back to confirmed">↩ Undo</ActionBtn>
      )}

      {canCorrect && (startedISO || finishedISO) && (
        <ActionBtn onClick={() => setModal("clock")} title="Correct the clock">🛠 Clock</ActionBtn>
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
          reasons={[...CANCEL_REASONS]} confirmLabel="Confirm cancel" pending={pending}
          onClose={() => setModal(null)} onConfirm={(reason) => run(() => cancelAppointment(id, reason))} />
      )}
      {modal === "delete" && (
        <ReasonModal title="Delete appointment"
          hint="This permanently removes the appointment. Pick a reason for the record."
          reasons={[...DELETE_REASONS]} confirmLabel="Delete" pending={pending}
          onClose={() => setModal(null)} onConfirm={(reason) => run(() => deleteAppointment(id, reason))} />
      )}
      {modal === "clock" && (
        <ClockModal startISO={startedISO ?? null} finishISO={finishedISO ?? null} pending={pending}
          onClose={() => setModal(null)}
          onSave={(s, f) => run(() => correctAppointmentClock(id, s, f))} />
      )}
      {modal === "collect" && (
        <CollectModal defaultCents={servicePriceCents ?? 0} pending={pending}
          onClose={() => setModal(null)}
          onConfirm={(cents) => run(() => finishAppointment(id, cents))} />
      )}
    </div>
  );
}

// Check-out: confirm how much the barber collected (they often take payment directly).
function CollectModal({ defaultCents, pending, onClose, onConfirm }: {
  defaultCents: number; pending: boolean; onClose: () => void; onConfirm: (cents: number) => void;
}) {
  const [amt, setAmt] = useState(defaultCents ? String(Math.round(defaultCents / 100)) : "");
  const cents = Math.max(0, Math.round(Number(amt || 0) * 100));
  return (
    <Modal title="Check out — amount collected" hint="Enter what you collected for this cut. Are you sure this is correct?" onClose={onClose}>
      <div>
        <div className="label">Amount collected</div>
        <div className="flex items-center gap-2">
          <span className="text-cream/60">$</span>
          <input value={amt} onChange={(e) => setAmt(e.target.value)} inputMode="decimal" placeholder="0" autoFocus className="input" />
        </div>
      </div>
      <div className="mt-6 flex justify-end gap-2">
        <button onClick={onClose} className="btn-ghost px-4 py-2 text-sm">Cancel</button>
        <button disabled={pending} onClick={() => onConfirm(cents)} className="btn-primary px-5 py-2 text-sm disabled:opacity-40">
          {pending ? "Saving…" : `Yes, I collected $${(cents / 100).toLocaleString()}`}
        </button>
      </div>
    </Modal>
  );
}

// Live-ticking elapsed timer while a cut is in progress.
function Elapsed({ startISO }: { startISO: string }) {
  const [now, setNow] = useState(() => new Date(startISO).getTime());
  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(t);
  }, []);
  const min = Math.max(0, Math.floor((now - new Date(startISO).getTime()) / 60000));
  return <span className="rounded-md bg-emerald-500/15 px-2 py-1 text-xs text-emerald-200">⏱ {min}m running</span>;
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
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [onClose]);
  if (!mounted) return null;
  // Portal to <body> so the overlay is never trapped in a card's stacking context.
  return createPortal(
    <div className="fixed inset-0 z-[100] grid place-items-center bg-black/70 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-charcoal p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-4">
          <h3 className="font-display text-xl">{title}</h3>
          <button onClick={onClose} className="text-cream/40 hover:text-cream">✕</button>
        </div>
        {hint && <p className="mt-1 text-sm text-cream/50">{hint}</p>}
        <div className="mt-4">{children}</div>
      </div>
    </div>,
    document.body,
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

function ReasonModal({ title, hint, reasons, confirmLabel, pending, onClose, onConfirm }: {
  title: string; hint: string; reasons: string[]; confirmLabel: string;
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

function ClockModal({ startISO, finishISO, pending, onClose, onSave }: {
  startISO: string | null; finishISO: string | null; pending: boolean;
  onClose: () => void; onSave: (startISO: string, finishISO: string) => void;
}) {
  const toLocal = (iso: string | null) => {
    if (!iso) return "";
    const d = new Date(iso);
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  };
  const [s, setS] = useState(toLocal(startISO));
  const [f, setF] = useState(toLocal(finishISO));
  const save = () => onSave(s ? new Date(s).toISOString() : "", f ? new Date(f).toISOString() : "");
  const mins = s && f ? Math.round((new Date(f).getTime() - new Date(s).getTime()) / 60000) : null;

  return (
    <Modal title="Correct the clock" hint="Adjust the start and finish times. Leave a field blank to clear it." onClose={onClose}>
      <div className="space-y-3">
        <div><div className="label">Started</div><input type="datetime-local" value={s} onChange={(e) => setS(e.target.value)} className="input" /></div>
        <div><div className="label">Finished</div><input type="datetime-local" value={f} onChange={(e) => setF(e.target.value)} className="input" /></div>
        {mins != null && <p className="text-sm text-cream/60">Turnaround: <span className="text-cream">{mins} min</span></p>}
      </div>
      <div className="mt-6 flex justify-end gap-2">
        <button onClick={onClose} className="btn-ghost px-4 py-2 text-sm">Cancel</button>
        <button disabled={pending} onClick={save} className="btn-primary px-5 py-2 text-sm disabled:opacity-40">{pending ? "Saving…" : "Save clock"}</button>
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
