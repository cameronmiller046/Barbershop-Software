"use client";

import { useState } from "react";
import { formatMoney } from "@/lib/utils";

const GOLD = "#d8b25c";
// Formatters live here (client side): functions can't be passed as props from
// a Server Component to a Client Component, so callers pass a `money` flag.
const asMoney = (v: number) => formatMoney(v);
const asNum = (v: number) => String(v);

/* Tiny inline sparkline for KPI cards. */
export function Sparkline({ values, up = true }: { values: number[]; up?: boolean }) {
  if (values.length < 2) return <div className="h-8" />;
  const w = 120, h = 32, max = Math.max(...values, 1), min = Math.min(...values, 0);
  const span = max - min || 1;
  const x = (i: number) => (i / (values.length - 1)) * w;
  const y = (v: number) => h - ((v - min) / span) * (h - 4) - 2;
  const line = values.map((v, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const col = up ? GOLD : "#f87171";
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-8 w-full" preserveAspectRatio="none">
      <path d={`${line} L${w},${h} L0,${h} Z`} fill={col} opacity="0.12" />
      <path d={line} fill="none" stroke={col} strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

/* Revenue trend — area + line with a dashed previous-period overlay and hover. */
export function AreaTrend({ points, money }: { points: { label: string; value: number; prevValue: number }[]; money?: boolean }) {
  const format = money ? asMoney : asNum;
  const [hi, setHi] = useState<number | null>(null);
  const w = 720, h = 220, padB = 22;
  const max = Math.max(...points.map((p) => Math.max(p.value, p.prevValue)), 1);
  const n = points.length;
  const x = (i: number) => (n <= 1 ? w / 2 : (i / (n - 1)) * w);
  const y = (v: number) => (h - padB) - (v / max) * (h - padB - 8);
  const path = (key: "value" | "prevValue") => points.map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(p[key]).toFixed(1)}`).join(" ");
  const area = `${path("value")} L${x(n - 1)},${h - padB} L0,${h - padB} Z`;
  const step = Math.ceil(n / 8);
  return (
    <div className="relative">
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full" preserveAspectRatio="none" onMouseLeave={() => setHi(null)}>
        <defs><linearGradient id="rt" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={GOLD} stopOpacity="0.32" /><stop offset="100%" stopColor={GOLD} stopOpacity="0" /></linearGradient></defs>
        {[0.25, 0.5, 0.75].map((g) => <line key={g} x1="0" x2={w} y1={(h - padB) * (1 - g) + 4} y2={(h - padB) * (1 - g) + 4} stroke="rgba(255,255,255,0.06)" />)}
        <path d={area} fill="url(#rt)" />
        <path d={path("prevValue")} fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="1.5" strokeDasharray="4 4" />
        <path d={path("value")} fill="none" stroke={GOLD} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        {hi != null && <line x1={x(hi)} x2={x(hi)} y1="0" y2={h - padB} stroke={GOLD} strokeOpacity="0.4" />}
        {hi != null && <circle cx={x(hi)} cy={y(points[hi].value)} r="3.5" fill={GOLD} />}
        {points.map((_, i) => <rect key={i} x={x(i) - w / n / 2} y="0" width={w / n} height={h - padB} fill="transparent" onMouseEnter={() => setHi(i)} />)}
        {points.map((p, i) => (i % step === 0 || i === n - 1) && <text key={i} x={x(i)} y={h - 6} fill="rgba(245,241,232,0.4)" fontSize="10" textAnchor="middle">{p.label}</text>)}
      </svg>
      {hi != null && (
        <div className="pointer-events-none absolute -translate-x-1/2 rounded-lg border border-white/10 bg-[#131217] px-3 py-2 text-xs shadow-xl" style={{ left: `${(x(hi) / w) * 100}%`, top: 0 }}>
          <div className="text-cream/50">{points[hi].label}</div>
          <div className="font-semibold text-brass">{format(points[hi].value)}</div>
          <div className="text-cream/40">prev {format(points[hi].prevValue)}</div>
        </div>
      )}
    </div>
  );
}

/* Vertical bars with hover tooltip. Optional `links` makes each bar navigable. */
export function Bars({ items, money, height = 150, links }: { items: { label: string; value: number }[]; money?: boolean; height?: number; links?: (string | null)[] }) {
  const format = money ? asMoney : asNum;
  const [hi, setHi] = useState<number | null>(null);
  const max = Math.max(...items.map((i) => i.value), 1);
  return (
    <div>
      <div className="flex items-end gap-1.5" style={{ height }}>
        {items.map((it, i) => {
          const href = links?.[i] ?? null;
          const inner = (
            <>
              {hi === i && <div className="absolute -top-9 z-10 whitespace-nowrap rounded-lg border border-white/10 bg-[#131217] px-2 py-1 text-xs font-semibold text-brass shadow-xl">{format(it.value)}</div>}
              <div className="w-full rounded-t-md transition-all" style={{ height: `${(it.value / max) * 100}%`, minHeight: it.value > 0 ? 3 : 0, background: hi === i ? "linear-gradient(180deg,#f6dd93,#d8b25c)" : "linear-gradient(180deg,rgba(216,178,92,0.7),rgba(216,178,92,0.25))" }} />
            </>
          );
          const cls = "group relative flex flex-1 flex-col items-center justify-end";
          return href
            ? <a key={i} href={href} className={cls} onMouseEnter={() => setHi(i)} onMouseLeave={() => setHi(null)}>{inner}</a>
            : <div key={i} className={cls} onMouseEnter={() => setHi(i)} onMouseLeave={() => setHi(null)}>{inner}</div>;
        })}
      </div>
      <div className="mt-1.5 flex gap-1.5">{items.map((it, i) => <div key={i} className="flex-1 truncate text-center text-[10px] text-cream/40">{it.label}</div>)}</div>
    </div>
  );
}

/* Donut with legend. */
export function Donut({ segments, money, links }: { segments: { label: string; value: number; color: string }[]; money?: boolean; links?: (string | null)[] }) {
  const format = money ? asMoney : null;
  const rawTotal = segments.reduce((s, x) => s + x.value, 0);
  const total = rawTotal || 1;
  const r = 42, c = 2 * Math.PI * r;
  let off = 0;
  return (
    <div className="flex items-center gap-5">
      <svg width="120" height="120" viewBox="0 0 120 120" className="shrink-0">
        <circle cx="60" cy="60" r={r} fill="none" stroke="#26242a" strokeWidth="14" />
        {segments.map((s, i) => {
          const frac = s.value / total;
          const el = <circle key={i} cx="60" cy="60" r={r} fill="none" stroke={s.color} strokeWidth="14" strokeDasharray={`${(frac * c).toFixed(1)} ${c.toFixed(1)}`} strokeDashoffset={(-off * c).toFixed(1)} transform="rotate(-90 60 60)" />;
          off += frac; return el;
        })}
        <text x="60" y="56" textAnchor="middle" fill="#f4f0e7" fontSize={format ? 14 : 20} fontWeight="700">{format ? format(rawTotal) : rawTotal}</text>
        <text x="60" y="72" textAnchor="middle" fill="rgba(245,241,232,0.4)" fontSize="9">total</text>
      </svg>
      <div className="space-y-1.5">
        {segments.map((s, i) => {
          const href = links?.[i] ?? null;
          const body = (
            <>
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: s.color }} />
              <span className={href ? "text-cream/70 group-hover:text-brass" : "text-cream/70"}>{s.label}</span>
              <span className="ml-auto font-medium text-cream">{format ? format(s.value) : s.value}</span>
            </>
          );
          return href
            ? <a key={s.label} href={href} className="group flex items-center gap-2 text-sm">{body}</a>
            : <div key={s.label} className="flex items-center gap-2 text-sm">{body}</div>;
        })}
      </div>
    </div>
  );
}

/* Peak-hours heatmap: 7 days × hours. */
export function Heatmap({ grid, hourFrom = 8, hourTo = 20 }: { grid: number[][]; hourFrom?: number; hourTo?: number }) {
  const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const max = Math.max(1, ...grid.flat());
  const hours = Array.from({ length: hourTo - hourFrom + 1 }, (_, i) => hourFrom + i);
  return (
    <div className="overflow-x-auto">
      <div className="min-w-[520px]">
        <div className="flex">
          <div className="w-9" />
          {hours.map((h) => <div key={h} className="flex-1 text-center text-[9px] text-cream/40">{((h + 11) % 12) + 1}{h < 12 ? "a" : "p"}</div>)}
        </div>
        {grid.map((row, d) => (
          <div key={d} className="mt-1 flex items-center">
            <div className="w-9 text-[10px] text-cream/50">{DOW[d]}</div>
            {hours.map((h) => {
              const v = row[h]; const a = v / max;
              return <div key={h} className="mx-0.5 flex-1" title={`${DOW[d]} ${((h + 11) % 12) + 1}${h < 12 ? "a" : "p"}: ${v}`} style={{ aspectRatio: "1", borderRadius: 4, background: v ? `rgba(216,178,92,${0.15 + a * 0.75})` : "rgba(255,255,255,0.03)" }} />;
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

/* Horizontal ranked bar row (used in tables/leaderboards). */
export function RankBar({ value, max }: { value: number; max: number }) {
  return <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/8"><div className="h-full rounded-full" style={{ width: `${max > 0 ? (value / max) * 100 : 0}%`, background: "linear-gradient(90deg,#d8b25c,#f6dd93)" }} /></div>;
}
