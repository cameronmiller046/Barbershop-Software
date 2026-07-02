"use client";

import { useEffect, useMemo, useState } from "react";

export type CalDay = { date: string; slots: { start: string; end: string }[] };

// Month calendar that only enables dates that have availability. Shared by the
// public booking wizard and the portal reschedule modal.
export function BookingCalendar({
  days, activeDay, onPick, brand = "var(--brand)", brandFg = "var(--brand-fg)",
}: {
  days: CalDay[];
  activeDay: string | null;
  onPick: (iso: string) => void;
  brand?: string;
  brandFg?: string;
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
    <div className="w-full max-w-[300px]">
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
                ? { background: brand, color: brandFg, borderColor: brand }
                : { borderColor: iso ? "rgba(255,255,255,0.18)" : "transparent" }}>
              {day}
            </button>
          );
        })}
      </div>
    </div>
  );
}
