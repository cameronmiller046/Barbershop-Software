"use client";

// Shared presentational primitives for the demo sandbox. Pure UI — they hold no
// business logic and never touch the store directly.

import { useEffect } from "react";
import { formatMoney, classNames as cx } from "@/lib/utils";
import { Icon, type IconName } from "@/components/home/icons";
import type { ApptStatus } from "@/lib/demo/types";

export { cx };

export function Money({ cents, className }: { cents: number; className?: string }) {
  return <span className={className}>{formatMoney(cents)}</span>;
}

export function PageHeader({
  title, subtitle, actions, badge,
}: { title: string; subtitle?: string; actions?: React.ReactNode; badge?: string }) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3 sm:mb-6 sm:gap-4">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2.5">
          <h1 className="font-display text-xl text-cream sm:text-3xl">{title}</h1>
          {badge && <span className="rounded-full border border-brass/40 bg-brass/10 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-brass">{badge}</span>}
        </div>
        {subtitle && <p className="mt-0.5 text-[13px] text-cream/50 sm:mt-1 sm:text-sm">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Panel({ children, className, pad = true }: { children: React.ReactNode; className?: string; pad?: boolean }) {
  // min-w-0 lets a Panel shrink inside a CSS grid/flex track instead of forcing
  // its intrinsic content width and overflowing the viewport on mobile.
  return <div className={cx("p-panel min-w-0", pad && "p-5", className)}>{children}</div>;
}

export function SectionTitle({ children, right }: { children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-cream/70">{children}</h2>
      {right}
    </div>
  );
}

export function KPI({
  label, value, icon, delta, hint, accent = "#d8b25c",
}: { label: string; value: React.ReactNode; icon: IconName; delta?: number; hint?: string; accent?: string }) {
  const I = Icon[icon];
  return (
    <div className="p-panel p-kpi min-w-0 p-4 sm:p-5">
      <div className="flex items-center justify-between">
        <span className="grid h-9 w-9 place-items-center rounded-xl sm:h-10 sm:w-10" style={{ background: `${accent}1f`, color: accent }}>
          <I className="h-5 w-5" />
        </span>
        {typeof delta === "number" && (
          <span className={cx("flex items-center gap-1 text-xs font-semibold", delta >= 0 ? "text-emerald-300" : "text-red-300")}>
            {delta >= 0 ? "▲" : "▼"} {Math.abs(delta)}%
          </span>
        )}
      </div>
      <div className="mt-2.5 text-xl font-semibold text-cream sm:mt-3 sm:text-2xl">{value}</div>
      <div className="mt-0.5 text-[11px] text-cream/50 sm:text-xs">{hint ?? label}</div>
    </div>
  );
}

const STATUS: Record<ApptStatus, { label: string; cls: string }> = {
  scheduled: { label: "Scheduled", cls: "st-scheduled" },
  confirmed: { label: "Confirmed", cls: "st-scheduled" },
  checked_in: { label: "Checked in", cls: "st-checkedin" },
  in_service: { label: "In service", cls: "st-inservice" },
  completed: { label: "Completed", cls: "st-completed" },
  no_show: { label: "No show", cls: "st-noshow" },
  cancelled: { label: "Cancelled", cls: "st-cancelled" },
};
export const statusMeta = (s: ApptStatus) => STATUS[s];
export function StatusBadge({ status }: { status: ApptStatus }) {
  const m = STATUS[status];
  return <span className={cx("badge", m.cls)}>{m.label}</span>;
}

export function Avatar({ name, color = "#d8b25c", size = 32 }: { name: string; color?: string; size?: number }) {
  const initials = name.split(" ").map((n) => n[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();
  return (
    <span
      className="grid shrink-0 place-items-center rounded-full font-semibold"
      style={{ width: size, height: size, background: `${color}26`, color, fontSize: size * 0.4 }}
    >
      {initials || "?"}
    </span>
  );
}

export function Tag({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "gold" | "green" | "red" | "blue" }) {
  const tones: Record<string, string> = {
    neutral: "border-white/12 text-cream/60",
    gold: "border-brass/40 bg-brass/10 text-brass",
    green: "border-emerald-400/30 bg-emerald-400/10 text-emerald-200",
    red: "border-red-400/30 bg-red-400/10 text-red-200",
    blue: "border-sky-400/30 bg-sky-400/10 text-sky-200",
  };
  return <span className={cx("rounded-full border px-2 py-0.5 text-[11px] font-medium", tones[tone])}>{children}</span>;
}

export function Btn({
  children, onClick, variant = "ghost", type = "button", disabled, className,
}: {
  children: React.ReactNode; onClick?: () => void; variant?: "gold" | "ghost" | "danger";
  type?: "button" | "submit"; disabled?: boolean; className?: string;
}) {
  const base = variant === "gold" ? "p-btn-gold" : variant === "danger"
    ? "inline-flex items-center justify-center gap-1.5 rounded-full border border-red-400/40 px-4 py-1.5 text-sm text-red-200 transition hover:bg-red-400/10"
    : "p-btn-ghost";
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={cx(base, className)}>
      {children}
    </button>
  );
}

export function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[11px] text-cream/40">{hint}</span>}
    </label>
  );
}

export function EmptyState({ icon = "spark", title, hint }: { icon?: IconName; title: string; hint?: string }) {
  const I = Icon[icon];
  return (
    <div className="grid place-items-center rounded-2xl border border-dashed border-white/10 px-6 py-12 text-center">
      <span className="mb-3 grid h-12 w-12 place-items-center rounded-full bg-white/5 text-cream/40"><I className="h-6 w-6" /></span>
      <div className="text-cream/80">{title}</div>
      {hint && <div className="mt-1 text-sm text-cream/40">{hint}</div>}
    </div>
  );
}

export function Modal({
  open, onClose, title, children, footer, wide,
}: { open: boolean; onClose: () => void; title: string; children: React.ReactNode; footer?: React.ReactNode; wide?: boolean }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[90] grid place-items-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className={cx("relative w-full rounded-2xl border border-white/10 bg-[#131217] shadow-2xl animate-fade-up", wide ? "max-w-2xl" : "max-w-md")}>
        <div className="flex items-center justify-between border-b border-white/8 px-5 py-3.5">
          <h3 className="font-display text-lg text-cream">{title}</h3>
          <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-full text-cream/50 transition hover:bg-white/5 hover:text-cream">✕</button>
        </div>
        <div className="p-scroll max-h-[70vh] overflow-y-auto p-5">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-white/8 px-5 py-3.5">{footer}</div>}
      </div>
    </div>
  );
}

/** Small non-persisting note used across read-only-simulation screens. */
export function SandboxNote({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-4 flex items-start gap-2 rounded-xl border border-brass/20 bg-brass/[0.06] px-3.5 py-2.5 text-xs text-brass/90">
      <Icon.shield className="mt-px h-4 w-4 shrink-0" />
      <span>{children}</span>
    </div>
  );
}
