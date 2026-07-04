"use client";

import { useEffect, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { startAppointment, finishAppointment, addAppointmentNote } from "@/app/portal/actions";
import { Icon } from "@/components/home/icons";

type Props = {
  id: string;
  clientName: string;
  serviceName: string;
  priceCents: number;
  durationMin: number;
  startedISO: string | null;
  checkedInISO: string | null;
  barberName?: string | null;
};

export function CurrentClientPanel(p: Props) {
  const inService = !!p.startedISO;
  const [pending, start] = useTransition();
  const [modal, setModal] = useState<null | "complete" | "note">(null);

  return (
    <div className="p-panel p-5">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-lg text-cream">Current Client</h3>
        <span className={`badge ${inService ? "st-inservice" : "st-checkedin"}`}>{inService ? "In Service" : "Checked In"}</span>
      </div>

      <div className="mt-5 flex flex-col items-center text-center">
        <span className="grid h-24 w-24 place-items-center rounded-full bg-gradient-to-br from-brass/30 to-brass/5 text-2xl font-bold text-brass ring-2 ring-brass/40">
          {initials(p.clientName)}
        </span>
        <div className="mt-3 font-display text-xl text-cream">{p.clientName}</div>
        <div className="text-sm text-cream/50">{p.serviceName}{p.barberName ? ` · ${p.barberName}` : ""}</div>
      </div>

      {inService ? (
        <ServiceTimer startedISO={p.startedISO!} durationMin={p.durationMin} />
      ) : (
        <WaitTimer sinceISO={p.checkedInISO} />
      )}

      <div className="mt-5 space-y-2">
        {inService ? (
          <button onClick={() => setModal("complete")} disabled={pending} className="p-btn-gold w-full">
            <Icon.check className="h-4 w-4" /> Complete Cut
          </button>
        ) : (
          <button onClick={() => start(() => startAppointment(p.id))} disabled={pending} className="p-btn-gold w-full">
            <Icon.scissors className="h-4 w-4" /> {pending ? "Starting…" : "Start Service"}
          </button>
        )}
        <div className="grid grid-cols-2 gap-2">
          <button onClick={() => setModal("note")} className="p-btn-ghost">
            <Icon.messages className="h-4 w-4" /> Add Note
          </button>
          <button disabled title="Coming soon" className="p-btn-ghost opacity-45">
            <Icon.plus className="h-4 w-4" /> Add Service
          </button>
        </div>
      </div>

      {modal === "complete" && (
        <CompleteModal defaultCents={p.priceCents} pending={pending}
          onClose={() => setModal(null)}
          onConfirm={(cents) => start(async () => { await finishAppointment(p.id, cents); setModal(null); })} />
      )}
      {modal === "note" && (
        <NoteModal pending={pending}
          onClose={() => setModal(null)}
          onSave={(text) => start(async () => { await addAppointmentNote(p.id, text); setModal(null); })} />
      )}
    </div>
  );
}

/* Empty state when no one is in the chair. */
export function CurrentClientEmpty() {
  return (
    <div className="p-panel flex flex-col items-center justify-center p-8 text-center">
      <span className="grid h-16 w-16 place-items-center rounded-full border border-white/10 text-cream/30"><Icon.scissors className="h-7 w-7" /></span>
      <div className="mt-4 font-display text-lg text-cream">No client in the chair</div>
      <p className="mt-1 text-sm text-cream/50">Check in your next client to get started.</p>
    </div>
  );
}

function ServiceTimer({ startedISO, durationMin }: { startedISO: string; durationMin: number }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);
  const started = new Date(startedISO).getTime();
  const elapsedMs = Math.max(0, now - started);
  const min = Math.floor(elapsedMs / 60000);
  const sec = Math.floor((elapsedMs % 60000) / 1000);
  const pct = Math.min(100, durationMin > 0 ? (elapsedMs / (durationMin * 60000)) * 100 : 0);
  const over = min >= durationMin && durationMin > 0;
  return (
    <div className="mt-6">
      <div className="flex items-end justify-between">
        <div>
          <div className="text-[10px] uppercase tracking-wide text-cream/40">Check-in time</div>
          <div className="text-sm text-cream">{new Date(startedISO).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}</div>
        </div>
        <div className="text-right">
          <div className="text-[10px] uppercase tracking-wide text-cream/40">Elapsed time</div>
          <div className={`font-display text-xl tabular-nums ${over ? "text-amber-300" : "text-brass"}`}>{min}:{String(sec).padStart(2, "0")}</div>
        </div>
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/8">
        <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${pct}%`, background: over ? "#f59e0b" : "linear-gradient(90deg,#d8b25c,#f6dd93)" }} />
      </div>
    </div>
  );
}

function WaitTimer({ sinceISO }: { sinceISO: string | null }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 30000); return () => clearInterval(t); }, []);
  const since = sinceISO ? new Date(sinceISO).getTime() : now;
  const min = Math.max(0, Math.floor((now - since) / 60000));
  return (
    <div className="mt-6 flex items-center justify-center gap-2 rounded-xl border border-brass/20 bg-brass/[0.06] py-3 text-sm text-brass/90">
      <Icon.clock className="h-4 w-4" /> Waiting {min} min · ready to start
    </div>
  );
}

function initials(name: string) {
  return name.split(" ").map((n) => n[0]).filter(Boolean).slice(0, 2).join("").toUpperCase() || "C";
}

/* ── modals ── */
function Shell({ title, hint, children, onClose }: { title: string; hint?: string; children: React.ReactNode; onClose: () => void }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [onClose]);
  if (!mounted) return null;
  return createPortal(
    <div className="fixed inset-0 z-[100] grid place-items-center bg-black/70 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#131217] p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-4">
          <h3 className="font-display text-xl text-cream">{title}</h3>
          <button onClick={onClose} className="text-cream/40 hover:text-cream">✕</button>
        </div>
        {hint && <p className="mt-1 text-sm text-cream/50">{hint}</p>}
        <div className="mt-4">{children}</div>
      </div>
    </div>,
    document.body,
  );
}

function CompleteModal({ defaultCents, pending, onClose, onConfirm }: { defaultCents: number; pending: boolean; onClose: () => void; onConfirm: (cents: number) => void }) {
  const [amt, setAmt] = useState(defaultCents ? String(Math.round(defaultCents / 100)) : "");
  const cents = Math.max(0, Math.round(Number(amt || 0) * 100));
  return (
    <Shell title="Complete cut" hint="Confirm what you collected for this service." onClose={onClose}>
      <div className="label">Amount collected</div>
      <div className="flex items-center gap-2">
        <span className="text-cream/60">$</span>
        <input value={amt} onChange={(e) => setAmt(e.target.value)} inputMode="decimal" placeholder="0" autoFocus className="input" />
      </div>
      <div className="mt-6 flex justify-end gap-2">
        <button onClick={onClose} className="p-btn-ghost">Cancel</button>
        <button disabled={pending} onClick={() => onConfirm(cents)} className="p-btn-gold">{pending ? "Saving…" : `Collected $${(cents / 100).toLocaleString()}`}</button>
      </div>
    </Shell>
  );
}

function NoteModal({ pending, onClose, onSave }: { pending: boolean; onClose: () => void; onSave: (text: string) => void }) {
  const [text, setText] = useState("");
  return (
    <Shell title="Add a note" hint="Saved to this appointment." onClose={onClose}>
      <textarea value={text} onChange={(e) => setText(e.target.value)} autoFocus rows={4} placeholder="e.g. Prefers a low fade, #2 on the sides" className="input min-h-[96px]" />
      <div className="mt-4 flex justify-end gap-2">
        <button onClick={onClose} className="p-btn-ghost">Cancel</button>
        <button disabled={pending || !text.trim()} onClick={() => onSave(text)} className="p-btn-gold disabled:opacity-40">{pending ? "Saving…" : "Save note"}</button>
      </div>
    </Shell>
  );
}
