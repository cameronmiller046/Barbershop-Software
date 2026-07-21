"use client";

import { useEffect, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { logWalkIn } from "@/app/portal/actions";
import { REFERRAL_TYPES } from "@/lib/appointmentMeta";
import { PAYMENT_METHODS } from "@/lib/payments";

type Svc = { id: string; name: string; priceCents: number };

const digitsOf = (s: string) => s.replace(/\D/g, "");

// Quick "log a cut" for walk-in or appointment traffic — new or existing client.
// Clients come from the shared client table, so kiosk-registered walk-ins are
// searchable here by phone (or name) too.
export function WalkInLogger({ services, clients }: { services: Svc[]; clients: { name: string; phone: string | null }[] }) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [serviceId, setServiceId] = useState(services[0]?.id ?? "");
  const [kind, setKind] = useState("WALKIN");
  const [referral, setReferral] = useState("");
  const [collected, setCollected] = useState("");
  const [tip, setTip] = useState("");
  const [method, setMethod] = useState<string>("Card");

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
    fd.set("tip", tip);
    fd.set("paymentMethod", method);
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
                <input
                  value={name}
                  onChange={(e) => {
                    const v = e.target.value;
                    setName(v);
                    const m = clients.find((c) => c.name.toLowerCase() === v.trim().toLowerCase());
                    if (m?.phone) setPhone(m.phone);
                  }}
                  list="walkin-clients"
                  autoFocus
                  placeholder="New or existing client"
                  className="input"
                />
                <datalist id="walkin-clients">
                  {clients.map((c, i) => <option key={i} value={c.name}>{c.phone ?? ""}</option>)}
                </datalist>
              </div>
              <div>
                <div className="label">Phone (optional) — search existing clients</div>
                <input
                  value={phone}
                  onChange={(e) => {
                    const v = e.target.value;
                    setPhone(v);
                    const d = digitsOf(v);
                    if (d.length >= 7) {
                      const m = clients.find((c) => c.phone && digitsOf(c.phone) === d);
                      if (m) setName(m.name);
                    }
                  }}
                  type="tel"
                  list="walkin-phones"
                  placeholder="(555) 123-4567"
                  className="input"
                />
                <datalist id="walkin-phones">
                  {clients.filter((c) => c.phone).map((c, i) => <option key={i} value={c.phone as string}>{c.name}</option>)}
                </datalist>
                {(() => {
                  const d = digitsOf(phone);
                  const m = d.length >= 7 ? clients.find((c) => c.phone && digitsOf(c.phone) === d) : null;
                  return m ? <p className="mt-1 text-xs text-emerald-300">Matched existing client: {m.name}</p> : null;
                })()}
              </div>
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
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="label">Amount collected</div>
                  <div className="flex items-center gap-2"><span className="text-cream/60">$</span>
                    <input value={collected} onChange={(e) => setCollected(e.target.value)} inputMode="decimal" placeholder="0" className="input" /></div>
                </div>
                <div>
                  <div className="label">Tip</div>
                  <div className="flex items-center gap-2"><span className="text-cream/60">$</span>
                    <input value={tip} onChange={(e) => setTip(e.target.value)} inputMode="decimal" placeholder="0" className="input" /></div>
                </div>
              </div>
              <div>
                <div className="label">Payment method</div>
                <div className="flex flex-wrap gap-2">
                  {PAYMENT_METHODS.map((m) => (
                    <button type="button" key={m} onClick={() => setMethod(m)}
                      className="rounded-full border px-3 py-1.5 text-sm transition"
                      style={method === m ? { background: "var(--brand)", color: "var(--brand-fg)", borderColor: "var(--brand)" } : { borderColor: "rgba(255,255,255,0.15)" }}>{m}</button>
                  ))}
                </div>
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
