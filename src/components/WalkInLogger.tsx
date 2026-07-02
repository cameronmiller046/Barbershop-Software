"use client";

import { useEffect, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { logWalkIn } from "@/app/portal/actions";
import { REFERRAL_TYPES } from "@/lib/appointmentMeta";

type Svc = { id: string; name: string; priceCents: number };

// Quick "log a cut" for walk-in or appointment traffic — new or existing client.
export function WalkInLogger({ services, clients }: { services: Svc[]; clients: { name: string }[] }) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [serviceId, setServiceId] = useState(services[0]?.id ?? "");
  const [kind, setKind] = useState("WALKIN");
  const [referral, setReferral] = useState("");
  const [collected, setCollected] = useState("");

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const svc = services.find((s) => s.id === serviceId);
  // Prefill the collected amount with the service price when the service changes.
  useEffect(() => { if (svc) setCollected(String(Math.round(svc.priceCents / 100))); }, [serviceId]); // eslint-disable-line

  const canSubmit = name.trim() && serviceId && referral && !pending;

  function reset() { setName(""); setPhone(""); setKind("WALKIN"); setReferral(""); }
  function submit() {
    const fd = new FormData();
    fd.set("name", name.trim());
    fd.set("phone", phone.trim());
    fd.set("serviceId", serviceId);
    fd.set("kind", kind);
    fd.set("referral", referral);
    fd.set("collected", collected);
    start(async () => { await logWalkIn(fd); setOpen(false); reset(); });
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className="btn-primary px-4 py-2 text-sm">＋ Log a cut</button>

      {open && mounted && createPortal(
        <div className="fixed inset-0 z-[100] grid place-items-center bg-black/70 p-4 backdrop-blur-sm" onClick={() => setOpen(false)}>
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-charcoal p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="font-display text-xl">Log a cut</h3>
                <p className="mt-1 text-sm text-cream/50">Get a walk-in or new client into the system in seconds.</p>
              </div>
              <button onClick={() => setOpen(false)} className="text-cream/40 hover:text-cream">✕</button>
            </div>

            <div className="mt-4 space-y-3">
              <div>
                <div className="label">Client name</div>
                <input value={name} onChange={(e) => setName(e.target.value)} list="walkin-clients" autoFocus placeholder="New or existing client" className="input" />
                <datalist id="walkin-clients">
                  {clients.map((c, i) => <option key={i} value={c.name} />)}
                </datalist>
              </div>
              <div><div className="label">Phone (optional)</div><input value={phone} onChange={(e) => setPhone(e.target.value)} type="tel" placeholder="(555) 123-4567" className="input" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="label">Service</div>
                  <select value={serviceId} onChange={(e) => setServiceId(e.target.value)} className="input">
                    {services.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div>
                  <div className="label">Type</div>
                  <select value={kind} onChange={(e) => setKind(e.target.value)} className="input">
                    <option value="WALKIN">Walk-in</option>
                    <option value="APPOINTMENT">Appointment</option>
                  </select>
                </div>
              </div>
              <div>
                <div className="label">How did they find us? <span className="text-flame">*</span></div>
                <select value={referral} onChange={(e) => setReferral(e.target.value)} className="input">
                  <option value="">Select a referral type…</option>
                  {REFERRAL_TYPES.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div>
                <div className="label">Amount collected</div>
                <div className="flex items-center gap-2"><span className="text-cream/60">$</span>
                  <input value={collected} onChange={(e) => setCollected(e.target.value)} inputMode="decimal" placeholder="0" className="input" /></div>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button onClick={() => setOpen(false)} className="btn-ghost px-4 py-2 text-sm">Cancel</button>
              <button disabled={!canSubmit} onClick={submit} className="btn-primary px-5 py-2 text-sm disabled:opacity-40">
                {pending ? "Logging…" : "Log cut"}
              </button>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
