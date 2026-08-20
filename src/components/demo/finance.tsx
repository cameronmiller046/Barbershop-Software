"use client";

// Presentational building blocks shared by every Financials page so Overview,
// Chair Rentals, Expenses, P&L and Transactions stay visually identical.

import { formatMoney, classNames as cx } from "@/lib/utils";
import { Icon, type IconName } from "@/components/home/icons";

export const GOLD = "#d8b25c";
export const GOLD_DIM = "#8a6f35";
export const GRAY = "#55555e";
export const GRAY_LT = "#9ca3af";
export const GREEN = "#34d399";
export const DONUT_COLORS = [GOLD, GOLD_DIM, GRAY_LT, GRAY, "#3b3b42", "#6b7280", "#c9a24b", "#4b5563"];

/** Date-range presets. The sandbox holds ~a month of appointments, so wider
 *  ranges scale the period deterministically rather than filtering to empty. */
export const RANGES = [
  { id: "month", label: "This Month", factor: 1 },
  { id: "last", label: "Last Month", factor: 0.872 },
  { id: "quarter", label: "Last 90 Days", factor: 2.94 },
  { id: "year", label: "This Year", factor: 10.4 },
] as const;

export const rangeFactor = (id: string) => RANGES.find((r) => r.id === id)?.factor ?? 1;

export function Select({
  value, onChange, options, className,
}: { value: string; onChange: (v: string) => void; options: { id: string; label: string }[]; className?: string }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={cx("rounded-xl border border-white/10 bg-[#17161b] px-3 py-1.5 text-xs text-cream focus:border-brass/50 focus:outline-none", className)}
    >
      {options.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
    </select>
  );
}

export function StatCard({
  label, value, icon, delta, invert, sub,
}: { label: string; value: string; icon: IconName; delta?: number; invert?: boolean; sub?: string }) {
  const I = Icon[icon];
  const good = invert ? (delta ?? 0) < 0 : (delta ?? 0) >= 0;
  return (
    <div className="p-panel min-w-0 p-4">
      <div className="flex items-center gap-2.5">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-brass/30 bg-brass/10 text-brass">
          <I className="h-4 w-4" />
        </span>
        <span className="truncate text-[13px] text-cream/70">{label}</span>
      </div>
      <div className="mt-2.5 truncate text-xl font-semibold text-cream sm:text-2xl">{value}</div>
      <div className="mt-1.5 flex items-center gap-1.5 text-[11px]">
        {typeof delta === "number" ? (
          <>
            <span className={cx("font-semibold", good ? "text-emerald-300" : "text-red-300")}>
              {delta >= 0 ? "▲" : "▼"} {Math.abs(delta)}%
            </span>
            <span className="text-cream/40">{sub ?? "vs last month"}</span>
          </>
        ) : (
          <span className="text-cream/40">{sub ?? ""}</span>
        )}
      </div>
    </div>
  );
}

/** Donut whose legend carries both the dollar amount and the share. */
export function MoneyDonut({
  segments, center, size = 150, thickness = 20,
}: { segments: { label: string; value: number; color: string }[]; center: React.ReactNode; size?: number; thickness?: number }) {
  const total = segments.reduce((s, x) => s + x.value, 0) || 1;
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  let offset = 0;
  return (
    <div className="flex flex-wrap items-center gap-5">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={thickness} />
          {segments.map((s) => {
            const len = (s.value / total) * c;
            const el = (
              <circle key={s.label} cx={size / 2} cy={size / 2} r={r} fill="none" stroke={s.color}
                strokeWidth={thickness} strokeDasharray={`${len} ${c - len}`} strokeDashoffset={-offset} />
            );
            offset += len;
            return el;
          })}
        </svg>
        <div className="absolute inset-0 grid place-items-center text-center">{center}</div>
      </div>
      {/* min-w forces the legend onto its own line in a narrow rail rather than
          letting flex crush the labels away to "C…" / "M…". */}
      <ul className="w-full min-w-[190px] flex-1 space-y-2 text-[13px] sm:w-auto">
        {segments.map((s) => (
          <li key={s.label} className="flex items-baseline gap-2">
            <span className="h-2.5 w-2.5 shrink-0 translate-y-[1px] rounded-full" style={{ background: s.color }} />
            <span className="min-w-0 flex-1 truncate text-cream/70">{s.label}</span>
            <span className="shrink-0 font-medium tabular-nums text-cream">{formatMoney(s.value)}</span>
            <span className="w-12 shrink-0 text-right tabular-nums text-cream/45">{((s.value / total) * 100).toFixed(1)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Take the biggest `n` items and roll everything else into a single "Other"
 * slice. Without this a truncated top-N donut silently drops the tail: the ring
 * no longer adds up to the total printed in its centre, and every percentage is
 * computed against the wrong base.
 */
export function topWithOther(
  items: { name: string; value: number }[], n = 5, otherLabel = "Other",
): { label: string; value: number; color: string }[] {
  const sorted = [...items].filter((i) => i.value > 0).sort((a, b) => b.value - a.value);
  const head = sorted.slice(0, n);
  const rest = sorted.slice(n).reduce((s, i) => s + i.value, 0);
  const out = head.map((i, idx) => ({ label: i.name, value: i.value, color: DONUT_COLORS[idx % DONUT_COLORS.length] }));
  if (rest > 0) out.push({ label: otherLabel, value: rest, color: DONUT_COLORS[Math.min(head.length, DONUT_COLORS.length - 1)] });
  return out;
}

/** Horizontal gold bar list — used for income categories and expense rankings. */
export function BarList({
  items, fmt,
}: { items: { name: string; value: number }[]; fmt: (v: number) => string }) {
  const max = Math.max(1, ...items.map((i) => i.value));
  const total = items.reduce((s, i) => s + i.value, 0) || 1;
  return (
    <ul className="space-y-4">
      {items.map((i) => (
        <li key={i.name}>
          <div className="mb-1.5 flex items-baseline justify-between gap-2 text-sm">
            <span className="min-w-0 truncate text-cream/80">{i.name}</span>
            <span className="flex shrink-0 items-baseline gap-3">
              <span className="font-medium text-cream">{fmt(i.value)}</span>
              <span className="w-11 text-right text-xs text-cream/45">{((i.value / total) * 100).toFixed(1)}%</span>
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-white/[0.06]">
            <div className="h-full rounded-full bg-gradient-to-r from-[#eccb7f] to-[#b98a3c]" style={{ width: `${(i.value / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

export function ProgressBar({ pct, tone = "gold" }: { pct: number; tone?: "gold" | "green" | "red" }) {
  const fills = {
    gold: "bg-gradient-to-r from-[#eccb7f] to-[#b98a3c]",
    green: "bg-gradient-to-r from-emerald-300 to-emerald-500",
    red: "bg-gradient-to-r from-red-300 to-red-500",
  };
  return (
    <div className="h-2 overflow-hidden rounded-full bg-white/[0.06]">
      <div className={cx("h-full rounded-full transition-all", fills[tone])} style={{ width: `${Math.max(0, Math.min(100, pct))}%` }} />
    </div>
  );
}

const STATUS_TONES: Record<string, string> = {
  Paid: "border-emerald-400/30 bg-emerald-400/10 text-emerald-200",
  Partial: "border-brass/40 bg-brass/10 text-brass",
  Overdue: "border-red-400/30 bg-red-400/10 text-red-200",
  Upcoming: "border-sky-400/30 bg-sky-400/10 text-sky-200",
  Vacant: "border-white/12 bg-white/[0.03] text-cream/50",
  Occupied: "border-emerald-400/30 bg-emerald-400/10 text-emerald-200",
};

export function StatusPill({ status }: { status: string }) {
  return (
    <span className={cx("inline-block rounded-full border px-2 py-0.5 text-[11px] font-medium", STATUS_TONES[status] ?? STATUS_TONES.Vacant)}>
      {status}
    </span>
  );
}

/** Money in shop-positive/negative colouring — green for in, red for out. */
export function Amount({ cents, className }: { cents: number; className?: string }) {
  return (
    <span className={cx("font-medium tabular-nums", cents < 0 ? "text-red-300" : "text-emerald-300", className)}>
      {cents < 0 ? "-" : ""}{formatMoney(Math.abs(cents))}
    </span>
  );
}

/** Table wrapper that scrolls itself rather than the page on narrow screens. */
export function TableWrap({ children, min = 720 }: { children: React.ReactNode; min?: number }) {
  return (
    <div className="-mx-1 overflow-x-auto px-1">
      <table className="w-full text-sm" style={{ minWidth: min }}>{children}</table>
    </div>
  );
}

export function Th({ children, right }: { children: React.ReactNode; right?: boolean }) {
  return <th className={cx("pb-2 text-[11px] font-medium uppercase tracking-wide text-cream/40", right ? "text-right" : "text-left")}>{children}</th>;
}

export function Td({ children, right, className }: { children: React.ReactNode; right?: boolean; className?: string }) {
  return <td className={cx("py-2.5 pr-3", right && "pr-0 text-right", className)}>{children}</td>;
}

/** Right-side detail drawer used by the chair-rental table. */
export function Drawer({ open, onClose, title, subtitle, children, footer }: {
  open: boolean; onClose: () => void; title: string; subtitle?: string;
  children: React.ReactNode; footer?: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[95]">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <aside className="p-scroll absolute right-0 top-0 flex h-full w-full max-w-[460px] flex-col overflow-y-auto border-l border-white/10 bg-[#0b0a0d] shadow-2xl">
        <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-white/8 bg-[#0b0a0d]/95 px-5 py-4 backdrop-blur">
          <div className="min-w-0">
            <h3 className="font-display text-lg text-cream">{title}</h3>
            {subtitle && <p className="mt-0.5 truncate text-xs text-cream/45">{subtitle}</p>}
          </div>
          <button onClick={onClose} aria-label="Close" className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-white/10 text-cream/60 transition hover:border-brass/40 hover:text-brass">✕</button>
        </div>
        <div className="flex-1 space-y-5 p-5">{children}</div>
        {footer && <div className="sticky bottom-0 border-t border-white/8 bg-[#0b0a0d]/95 p-4 backdrop-blur">{footer}</div>}
      </aside>
    </div>
  );
}

/** Label/value row used throughout the drawer. */
export function DRow({ label, value, strong }: { label: string; value: React.ReactNode; strong?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1.5 text-sm">
      <span className="text-cream/50">{label}</span>
      <span className={cx("text-right", strong ? "font-semibold text-cream" : "text-cream/85")}>{value}</span>
    </div>
  );
}

export function DSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h4 className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-cream/35">{title}</h4>
      <div className="divide-y divide-white/5 rounded-xl border border-white/8 bg-white/[0.02] px-3.5 py-1">{children}</div>
    </section>
  );
}

/** Build a CSV and hand it to the browser as a real download. */
export function downloadCsv(filename: string, rows: (string | number)[][]) {
  const esc = (v: string | number) => {
    const s = String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const blob = new Blob([rows.map((r) => r.map(esc).join(",")).join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** Cents → "1234.56" for CSV cells (no $ so spreadsheets parse it as a number). */
export const csvMoney = (cents: number) => (cents / 100).toFixed(2);

export { cx, formatMoney };
