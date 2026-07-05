"use client";

import { useEffect, useMemo, useState } from "react";
import { formatMoney, formatDuration, classNames } from "@/lib/utils";
import { BookingCalendar } from "@/components/BookingCalendar";

type ServiceLite = {
  id: string; name: string; description: string | null; durationMin: number;
  priceCents: number; barberId: string | null; barberName: string | null;
};
type BarberLite = { id: string; name: string };
type Slot = { start: string; end: string };
type Day = { date: string; slots: Slot[] };

export function BookingWizard({
  slug, brand, services, barbers, preselectedServiceId,
}: {
  slug: string;
  brand: string;
  services: ServiceLite[];
  barbers: BarberLite[];
  preselectedServiceId: string | null;
}) {
  const [serviceId, setServiceId] = useState<string | null>(
    preselectedServiceId && services.some((s) => s.id === preselectedServiceId) ? preselectedServiceId : null,
  );
  const [barberId, setBarberId] = useState<string | null>(null);
  const [resolvedBarberId, setResolvedBarberId] = useState<string | null>(null);
  const [days, setDays] = useState<Day[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [activeDay, setActiveDay] = useState<string | null>(null);
  const [slot, setSlot] = useState<Slot | null>(null);
  const [form, setForm] = useState({ name: "", email: "", phone: "", notes: "" });
  const [tipPct, setTipPct] = useState<number | null>(null); // preset percentage, or null when none / custom
  const [customTip, setCustomTip] = useState(""); // dollars, when the customer types an exact amount
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const service = useMemo(() => services.find((s) => s.id === serviceId) ?? null, [services, serviceId]);
  const serviceLocksBarber = Boolean(service?.barberId);

  // Resolve the tip to cents: a chosen percentage of the service, or a typed custom amount.
  const tipCents = useMemo(() => {
    if (tipPct != null && service) return Math.round((service.priceCents * tipPct) / 100);
    const c = Math.round(Number(customTip || 0) * 100);
    return Number.isFinite(c) && c > 0 ? c : 0;
  }, [tipPct, customTip, service]);

  // Load availability when service or chosen barber changes.
  useEffect(() => {
    if (!serviceId) return;
    setLoadingSlots(true);
    setDays([]); setSlot(null); setActiveDay(null);
    const qs = new URLSearchParams({ serviceId });
    if (barberId && !serviceLocksBarber) qs.set("barberId", barberId);
    fetch(`/api/t/${slug}/availability?${qs}`)
      .then((r) => r.json())
      .then((data) => {
        setResolvedBarberId(data.barberId ?? null);
        setDays(data.days ?? []);
        setActiveDay(data.days?.[0]?.date ?? null);
      })
      .catch(() => setError("Couldn't load available times."))
      .finally(() => setLoadingSlots(false));
  }, [serviceId, barberId, serviceLocksBarber, slug]);

  const activeSlots = days.find((d) => d.date === activeDay)?.slots ?? [];

  async function submit() {
    if (!service || !resolvedBarberId || !slot || !form.name.trim() || !form.phone.trim()) return;
    if (form.phone.replace(/\D/g, "").length < 7) {
      setError("Enter a valid phone number so we can reach you."); return;
    }
    setSubmitting(true); setError(null);
    try {
      const res = await fetch(`/api/t/${slug}/appointments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serviceId: service.id, barberId: resolvedBarberId, start: slot.start, tipCents, ...form }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Something went wrong."); setSubmitting(false); return; }
      window.location.href = data.redirect;
    } catch {
      setError("Network error — please try again."); setSubmitting(false);
    }
  }

  const sel = { borderColor: brand, background: `${brand}1a` };

  return (
    <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="min-w-0 space-y-6">
        {/* Step 1: service */}
        <section className="card">
          <StepHeading n={1} title="Choose a service" brand={brand} />
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {services.map((s) => (
              <button key={s.id} onClick={() => setServiceId(s.id)}
                className="rounded-xl border p-4 text-left transition"
                style={serviceId === s.id ? sel : { borderColor: "rgba(255,255,255,0.1)" }}>
                <div className="flex items-baseline justify-between">
                  <span className="font-medium">{s.name}</span>
                  <span style={{ color: brand }}>{formatMoney(s.priceCents)}</span>
                </div>
                <div className="mt-1 text-xs text-cream/50">
                  {formatDuration(s.durationMin)}{s.barberName ? ` · ${s.barberName}` : ""}
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* Step 2: barber (hidden if service locks a barber) */}
        {service && !serviceLocksBarber && barbers.length > 1 && (
          <section className="card">
            <StepHeading n={2} title="Choose your barber" brand={brand} />
            <div className="mt-4 flex flex-wrap gap-2">
              <button onClick={() => setBarberId(null)}
                className="rounded-full border px-4 py-2 text-sm"
                style={barberId === null ? sel : { borderColor: "rgba(255,255,255,0.1)" }}>
                Next available
              </button>
              {barbers.map((b) => (
                <button key={b.id} onClick={() => setBarberId(b.id)}
                  className="rounded-full border px-4 py-2 text-sm"
                  style={barberId === b.id ? sel : { borderColor: "rgba(255,255,255,0.1)" }}>
                  {b.name}
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Step 3: time */}
        {service && (
          <section className="card">
            <StepHeading n={serviceLocksBarber || barbers.length <= 1 ? 2 : 3} title="Pick a time" brand={brand} />
            {loadingSlots ? (
              <p className="mt-4 text-sm text-cream/50">Loading available times…</p>
            ) : days.length === 0 ? (
              <p className="mt-4 text-sm text-cream/50">No open times soon. Please call the shop.</p>
            ) : (
              <div className="mt-4 grid gap-5 sm:grid-cols-[auto_1fr]">
                <BookingCalendar days={days} activeDay={activeDay} brand={brand}
                  onPick={(iso) => { setActiveDay(iso); setSlot(null); }} />
                <div className="min-w-0">
                  <div className="text-xs font-semibold uppercase tracking-wide text-cream/40">
                    {activeDay ? new Date(activeDay).toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" }) : "Available times"}
                  </div>
                  {activeSlots.length === 0 ? (
                    <p className="mt-3 text-sm text-cream/50">Pick a date to see open times.</p>
                  ) : (
                    <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
                      {activeSlots.map((s) => {
                        const t = new Date(s.start);
                        const active = slot?.start === s.start;
                        return (
                          <button key={s.start} onClick={() => setSlot(s)}
                            className="rounded-lg border px-2 py-2 text-sm"
                            style={active ? { background: brand, color: "#0f0f10", borderColor: brand } : { borderColor: "rgba(255,255,255,0.1)" }}>
                            {t.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}
          </section>
        )}

        {/* Step 4: details */}
        {service && slot && (
          <section className="card">
            <StepHeading n={serviceLocksBarber || barbers.length <= 1 ? 3 : 4} title="Your details" brand={brand} />
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div><label className="label">Name <span style={{ color: brand }}>*</span></label>
                <input className="input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Jordan Smith" /></div>
              <div><label className="label">Phone <span style={{ color: brand }}>*</span></label>
                <input className="input" type="tel" required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="(555) 123-4567" /></div>
              <div className="sm:col-span-2"><label className="label">Email (optional)</label>
                <input className="input" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="you@example.com" /></div>
              <div className="sm:col-span-2"><label className="label">Notes (optional)</label>
                <textarea className="input min-h-[72px]" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
            </div>
          </section>
        )}

        {/* Step 5: gratuity (optional) */}
        {service && slot && (
          <section className="card">
            <StepHeading n={serviceLocksBarber || barbers.length <= 1 ? 4 : 5} title="Add a tip (optional)" brand={brand} />
            <p className="mt-2 text-sm text-cream/50">Show your barber some love — your tip goes straight to them. You can also tip in person.</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <TipChip label="No tip" active={tipPct === null && !customTip} brand={brand}
                onClick={() => { setTipPct(null); setCustomTip(""); }} />
              {[15, 18, 20, 25].map((p) => (
                <TipChip key={p} label={`${p}%`}
                  sub={formatMoney(Math.round((service.priceCents * p) / 100))}
                  active={tipPct === p} brand={brand}
                  onClick={() => { setTipPct(p); setCustomTip(""); }} />
              ))}
            </div>
            <div className="mt-3 max-w-[220px]">
              <label className="label">Custom amount</label>
              <div className="flex items-center gap-2">
                <span className="text-cream/60">$</span>
                <input className="input" inputMode="decimal" placeholder="0"
                  value={customTip}
                  onChange={(e) => { setCustomTip(e.target.value); setTipPct(null); }} />
              </div>
            </div>
          </section>
        )}
      </div>

      {/* Summary */}
      <aside className="lg:sticky lg:top-6 lg:self-start">
        <div className="card">
          <h3 className="font-display text-xl">Summary</h3>
          <dl className="mt-4 space-y-2 text-sm">
            <Row label="Service" value={service?.name ?? "—"} />
            <Row label="Barber" value={service?.barberName ?? (barberId ? barbers.find((b) => b.id === barberId)?.name ?? "—" : service ? "Next available" : "—")} />
            <Row label="When" value={slot ? new Date(slot.start).toLocaleString(undefined, { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "—"} />
            <Row label="Price" value={service ? formatMoney(service.priceCents) : "—"} />
            {tipCents > 0 && <Row label="Tip" value={formatMoney(tipCents)} />}
          </dl>
          {service && tipCents > 0 && (
            <div className="mt-3 flex justify-between border-t border-white/10 pt-3 text-sm font-semibold">
              <span>Total</span>
              <span style={{ color: brand }}>{formatMoney(service.priceCents + tipCents)}</span>
            </div>
          )}
          {error && <p className="mt-4 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">{error}</p>}
          <button disabled={!service || !slot || !form.name.trim() || submitting} onClick={submit}
            className="mt-5 w-full rounded-full px-5 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-40"
            style={{ background: brand, color: "#0f0f10" }}>
            {submitting ? "Booking…" : "Confirm booking"}
          </button>
          <p className="mt-3 text-center text-xs text-cream/40">Reschedule or cancel any time from your confirmation link.</p>
        </div>
      </aside>
    </div>
  );
}


function StepHeading({ n, title, brand }: { n: number; title: string; brand: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="grid h-7 w-7 place-items-center rounded-full text-sm font-bold" style={{ background: brand, color: "#0f0f10" }}>{n}</span>
      <h2 className="font-display text-2xl">{title}</h2>
    </div>
  );
}

function TipChip({ label, sub, active, brand, onClick }: { label: string; sub?: string; active: boolean; brand: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick}
      className="rounded-xl border px-4 py-2 text-center text-sm transition"
      style={active ? { borderColor: brand, background: `${brand}1a` } : { borderColor: "rgba(255,255,255,0.1)" }}>
      <span className="font-medium">{label}</span>
      {sub && <span className="block text-[11px] text-cream/50">{sub}</span>}
    </button>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-cream/50">{label}</dt>
      <dd className="text-right">{value}</dd>
    </div>
  );
}
