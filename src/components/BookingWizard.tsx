"use client";

import { useEffect, useMemo, useState } from "react";
import { formatMoney, formatDuration, classNames } from "@/lib/utils";

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
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const service = useMemo(() => services.find((s) => s.id === serviceId) ?? null, [services, serviceId]);
  const serviceLocksBarber = Boolean(service?.barberId);

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
    if (!service || !resolvedBarberId || !slot || !form.name.trim()) return;
    if (!form.email.trim() && !form.phone.trim()) {
      setError("Add an email or phone so we can reach you."); return;
    }
    setSubmitting(true); setError(null);
    try {
      const res = await fetch(`/api/t/${slug}/appointments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serviceId: service.id, barberId: resolvedBarberId, start: slot.start, ...form }),
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
                <Calendar days={days} activeDay={activeDay} brand={brand}
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
              <div><label className="label">Name</label>
                <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Jordan Smith" /></div>
              <div><label className="label">Phone</label>
                <input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="(555) 123-4567" /></div>
              <div className="sm:col-span-2"><label className="label">Email</label>
                <input className="input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="you@example.com" /></div>
              <div className="sm:col-span-2"><label className="label">Notes (optional)</label>
                <textarea className="input min-h-[72px]" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
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
          </dl>
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

// Month calendar that only enables dates with availability. Replaces the old
// horizontal day strip (which overflowed the viewport).
function Calendar({
  days, activeDay, onPick, brand,
}: {
  days: Day[];
  activeDay: string | null;
  onPick: (iso: string) => void;
  brand: string;
}) {
  const keyOf = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
  const monthStart = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1);

  const availByKey = useMemo(() => {
    const m = new Map<string, string>();
    for (const d of days) m.set(keyOf(new Date(d.date)), d.date);
    return m;
  }, [days]);

  const firstDate = days.length ? new Date(days[0].date) : new Date();
  const lastDate = days.length ? new Date(days[days.length - 1].date) : new Date();
  const minMonth = monthStart(firstDate);
  const maxMonth = monthStart(lastDate);

  const [view, setView] = useState<Date>(monthStart(activeDay ? new Date(activeDay) : firstDate));
  // Jump to the first available month whenever availability reloads.
  useEffect(() => { setView(monthStart(firstDate)); }, [days]); // eslint-disable-line react-hooks/exhaustive-deps

  const y = view.getFullYear();
  const mo = view.getMonth();
  const firstWeekday = new Date(y, mo, 1).getDay();
  const daysInMonth = new Date(y, mo + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array<null>(firstWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  const canPrev = view > minMonth;
  const canNext = view < maxMonth;

  return (
    <div className="w-full max-w-[280px]">
      <div className="flex items-center justify-between">
        <button type="button" disabled={!canPrev} onClick={() => setView(new Date(y, mo - 1, 1))}
          className="rounded-lg border border-white/10 px-2.5 py-1 text-sm transition hover:bg-white/5 disabled:opacity-25">‹</button>
        <div className="text-sm font-medium">{view.toLocaleDateString(undefined, { month: "long", year: "numeric" })}</div>
        <button type="button" disabled={!canNext} onClick={() => setView(new Date(y, mo + 1, 1))}
          className="rounded-lg border border-white/10 px-2.5 py-1 text-sm transition hover:bg-white/5 disabled:opacity-25">›</button>
      </div>
      <div className="mt-3 grid grid-cols-7 gap-1 text-center text-[10px] uppercase text-cream/40">
        {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d, i) => <div key={i}>{d}</div>)}
      </div>
      <div className="mt-1 grid grid-cols-7 gap-1">
        {cells.map((day, i) => {
          if (day === null) return <div key={i} />;
          const iso = availByKey.get(keyOf(new Date(y, mo, day)));
          const selected = !!iso && activeDay === iso;
          return (
            <button key={i} type="button" disabled={!iso} onClick={() => iso && onPick(iso)}
              className="grid aspect-square place-items-center rounded-lg border text-sm transition enabled:hover:border-white/40 disabled:cursor-not-allowed disabled:text-cream/25"
              style={selected
                ? { background: brand, color: "#0f0f10", borderColor: brand }
                : { borderColor: iso ? "rgba(255,255,255,0.18)" : "transparent" }}>
              {day}
            </button>
          );
        })}
      </div>
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

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-cream/50">{label}</dt>
      <dd className="text-right">{value}</dd>
    </div>
  );
}
