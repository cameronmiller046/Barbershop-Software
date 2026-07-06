"use client";

// Lightweight, dependency-free inline-SVG charts for the demo dashboards.

import { formatMoney } from "@/lib/utils";

const GOLD = "#d8b25c";

export function BarChart({
  data, height = 180, money = false, color = GOLD,
}: { data: { label: string; value: number }[]; height?: number; money?: boolean; color?: string }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div className="flex items-end gap-2" style={{ height }}>
      {data.map((d) => (
        <div key={d.label} className="group flex flex-1 flex-col items-center justify-end gap-1.5">
          <span className="text-[10px] font-medium text-cream/0 transition group-hover:text-cream/70">
            {money ? formatMoney(d.value) : d.value}
          </span>
          <div
            className="w-full rounded-t-md transition-all duration-300"
            style={{ height: `${(d.value / max) * (height - 34)}px`, background: `linear-gradient(180deg, ${color}, ${color}66)`, minHeight: 3 }}
          />
          <span className="truncate text-[10px] text-cream/45">{d.label}</span>
        </div>
      ))}
    </div>
  );
}

export function AreaChart({
  data, height = 200, money = true, color = GOLD,
}: { data: { label: string; value: number }[]; height?: number; money?: boolean; color?: string }) {
  const w = 640;
  const pad = 8;
  const max = Math.max(1, ...data.map((d) => d.value));
  const min = Math.min(...data.map((d) => d.value), 0);
  const range = max - min || 1;
  const x = (i: number) => pad + (i * (w - pad * 2)) / Math.max(1, data.length - 1);
  const y = (v: number) => height - pad - ((v - min) / range) * (height - pad * 2);
  const line = data.map((d, i) => `${i === 0 ? "M" : "L"}${x(i)},${y(d.value)}`).join(" ");
  const area = `${line} L${x(data.length - 1)},${height - pad} L${x(0)},${height - pad} Z`;
  const id = `g_${color.replace("#", "")}`;
  return (
    <div className="w-full overflow-hidden">
      <svg viewBox={`0 0 ${w} ${height}`} className="w-full" style={{ height }} preserveAspectRatio="none">
        <defs>
          <linearGradient id={id} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.35" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75].map((f) => (
          <line key={f} x1={pad} x2={w - pad} y1={height * f} y2={height * f} stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
        ))}
        <path d={area} fill={`url(#${id})`} />
        <path d={line} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
        {data.map((d, i) => <circle key={i} cx={x(i)} cy={y(d.value)} r="2.5" fill={color} />)}
      </svg>
      <div className="mt-1 flex justify-between px-1 text-[10px] text-cream/40">
        {data.map((d, i) => (i % Math.ceil(data.length / 8 || 1) === 0 ? <span key={i}>{d.label}</span> : <span key={i} />))}
      </div>
      <span className="sr-only">{money ? formatMoney(max) : max}</span>
    </div>
  );
}

export function Donut({
  segments, size = 160, thickness = 22, center,
}: { segments: { label: string; value: number; color: string }[]; size?: number; thickness?: number; center?: React.ReactNode }) {
  const total = segments.reduce((s, x) => s + x.value, 0) || 1;
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  let offset = 0;
  return (
    <div className="flex items-center gap-5">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={thickness} />
          {segments.map((s) => {
            const len = (s.value / total) * c;
            const el = (
              <circle key={s.label} cx={size / 2} cy={size / 2} r={r} fill="none" stroke={s.color}
                strokeWidth={thickness} strokeDasharray={`${len} ${c - len}`} strokeDashoffset={-offset} strokeLinecap="butt" />
            );
            offset += len;
            return el;
          })}
        </svg>
        {center && <div className="absolute inset-0 grid place-items-center text-center">{center}</div>}
      </div>
      <ul className="space-y-1.5 text-sm">
        {segments.map((s) => (
          <li key={s.label} className="flex items-center gap-2 text-cream/70">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: s.color }} />
            <span className="flex-1">{s.label}</span>
            <span className="font-medium text-cream">{Math.round((s.value / total) * 100)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Sparkline({ data, color = GOLD, width = 90, height = 28 }: { data: number[]; color?: string; width?: number; height?: number }) {
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const pts = data.map((v, i) => `${(i * width) / (data.length - 1)},${height - ((v - min) / range) * height}`).join(" ");
  return (
    <svg width={width} height={height} className="overflow-visible">
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
