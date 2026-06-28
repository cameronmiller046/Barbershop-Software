"use client";

import { useEffect, useState } from "react";

type Slot = { start: string; end: string };
type Day = { date: string; slots: Slot[] };

export function ManageAppointment({
  slug, token, serviceId, brand,
}: {
  slug: string; token: string; serviceId: string; brand: string;
}) {
  const [open, setOpen] = useState(false);
  const [days, setDays] = useState<Day[]>([]);
  const [activeDay, setActiveDay] = useState<string | null>(null);
  const [slot, setSlot] = useState<Slot | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || days.length) return;
    fetch(`/api/t/${slug}/availability?serviceId=${serviceId}`)
      .then((r) => r.json())
      .then((data) => { setDays(data.days ?? []); setActiveDay(data.days?.[0]?.date ?? null); })
      .catch(() => setError("Couldn't load times."));
  }, [open, slug, serviceId, days.length]);

  const activeSlots = days.find((d) => d.date === activeDay)?.slots ?? [];
  const sel = { borderColor: brand, background: `${brand}1a` };

  async function reschedule() {
    if (!slot) return;
    setBusy(true); setError(null);
    const res = await fetch(`/api/t/${slug}/appointments/${token}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "reschedule", start: slot.start }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error || "Couldn't reschedule."); setBusy(false); return; }
    window.location.href = `/t/${slug}/appointments/${token}?rescheduled=1`;
  }

  async function cancel() {
    if (!confirm("Cancel this appointment?")) return;
    setBusy(true);
    const res = await fetch(`/api/t/${slug}/appointments/${token}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "cancel" }),
    });
    if (res.ok) window.location.reload(); else setBusy(false);
  }

  return (
    <div className="card mt-6">
      <div className="flex flex-wrap gap-3">
        <button onClick={() => setOpen((v) => !v)} className="rounded-full px-5 py-2.5 text-sm font-semibold" style={{ background: brand, color: "#0f0f10" }}>
          {open ? "Close" : "Reschedule"}
        </button>
        <button onClick={cancel} disabled={busy} className="btn-ghost text-red-300 hover:bg-red-500/10">Cancel appointment</button>
      </div>

      {open && (
        <div className="mt-5">
          <h3 className="font-display text-xl">Choose a new time</h3>
          {days.length === 0 ? (
            <p className="mt-3 text-sm text-cream/50">Loading times…</p>
          ) : (
            <>
              <div className="mt-3 flex gap-2 overflow-x-auto pb-2">
                {days.map((d) => {
                  const date = new Date(d.date);
                  return (
                    <button key={d.date} onClick={() => { setActiveDay(d.date); setSlot(null); }}
                      className="min-w-[72px] rounded-lg border px-2 py-2 text-center text-xs"
                      style={activeDay === d.date ? sel : { borderColor: "rgba(255,255,255,0.1)" }}>
                      <div className="text-cream/50">{date.toLocaleDateString(undefined, { weekday: "short" })}</div>
                      <div className="text-base font-semibold">{date.toLocaleDateString(undefined, { day: "numeric" })}</div>
                    </button>
                  );
                })}
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
                {activeSlots.map((s) => {
                  const t = new Date(s.start);
                  return (
                    <button key={s.start} onClick={() => setSlot(s)}
                      className="rounded-lg border px-2 py-2 text-sm"
                      style={slot?.start === s.start ? { background: brand, color: "#0f0f10", borderColor: brand } : { borderColor: "rgba(255,255,255,0.1)" }}>
                      {t.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
                    </button>
                  );
                })}
              </div>
              {error && <p className="mt-3 text-sm text-red-300">{error}</p>}
              <button disabled={!slot || busy} onClick={reschedule}
                className="mt-4 rounded-full px-5 py-2.5 text-sm font-semibold disabled:opacity-40" style={{ background: brand, color: "#0f0f10" }}>
                {busy ? "Saving…" : "Confirm new time"}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
