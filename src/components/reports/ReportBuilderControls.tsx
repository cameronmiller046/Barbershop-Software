"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { BUILDER_METRICS, BUILDER_DIMENSIONS } from "@/lib/reportBuilder";
import { PRESETS } from "@/lib/reportRange";
import { Icon } from "@/components/home/icons";

type Opt = { value: string; label: string };
type Cfg = {
  metric: string; dim: string; preset: string; from: string; to: string;
  barberId: string; serviceId: string; status: string; channel: string;
};

export function ReportBuilderControls({
  cfg, barbers, services,
}: {
  cfg: Cfg;
  barbers: Opt[];
  services: Opt[];
}) {
  const router = useRouter();
  const [local, setLocal] = useState(cfg);

  const go = (next: Partial<Cfg>) => {
    const merged = { ...local, ...next };
    setLocal(merged);
    const qs = new URLSearchParams();
    qs.set("metric", merged.metric);
    qs.set("dim", merged.dim);
    qs.set("preset", merged.preset);
    if (merged.preset === "custom") { if (merged.from) qs.set("from", merged.from); if (merged.to) qs.set("to", merged.to); }
    if (merged.barberId) qs.set("barberId", merged.barberId);
    if (merged.serviceId) qs.set("serviceId", merged.serviceId);
    if (merged.status) qs.set("status", merged.status);
    if (merged.channel) qs.set("channel", merged.channel);
    router.push(`/portal/reports/builder?${qs.toString()}`);
  };

  return (
    <div className="p-panel p-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Measure">
          <Select value={local.metric} onChange={(v) => go({ metric: v })}
            options={BUILDER_METRICS.map((m) => ({ value: m.key, label: m.label }))} />
        </Field>
        <Field label="Group by">
          <Select value={local.dim} onChange={(v) => go({ dim: v })}
            options={BUILDER_DIMENSIONS.map((d) => ({ value: d.key, label: d.label }))} />
        </Field>
        <Field label="Date range">
          <Select value={local.preset} onChange={(v) => go({ preset: v })}
            options={PRESETS.map(([k, l]) => ({ value: k, label: l }))} />
        </Field>
        <Field label="Barber">
          <Select value={local.barberId} onChange={(v) => go({ barberId: v })}
            options={[{ value: "", label: "All barbers" }, ...barbers]} />
        </Field>
        <Field label="Service">
          <Select value={local.serviceId} onChange={(v) => go({ serviceId: v })}
            options={[{ value: "", label: "All services" }, ...services]} />
        </Field>
        <Field label="Status">
          <Select value={local.status} onChange={(v) => go({ status: v })}
            options={[{ value: "", label: "Any status" }, { value: "COMPLETED", label: "Completed" }, { value: "CONFIRMED", label: "Scheduled" }, { value: "CANCELLED", label: "Cancelled" }, { value: "NO_SHOW", label: "No-show" }]} />
        </Field>
        <Field label="Channel">
          <Select value={local.channel} onChange={(v) => go({ channel: v })}
            options={[{ value: "", label: "All channels" }, { value: "walkin", label: "Walk-in" }, { value: "online", label: "Online / Scheduled" }]} />
        </Field>
        {local.preset === "custom" && (
          <Field label="Custom dates">
            <div className="flex items-center gap-1.5">
              <input type="date" value={local.from} onChange={(e) => setLocal({ ...local, from: e.target.value })}
                className="w-full rounded-lg border border-white/10 bg-white/[0.02] px-2 py-2 text-sm text-cream" />
              <input type="date" value={local.to} onChange={(e) => setLocal({ ...local, to: e.target.value })}
                className="w-full rounded-lg border border-white/10 bg-white/[0.02] px-2 py-2 text-sm text-cream" />
              <button onClick={() => go({})} className="p-btn-gold shrink-0 !px-3 !py-2 text-xs">Go</button>
            </div>
          </Field>
        )}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] uppercase tracking-wide text-cream/40">{label}</span>
      {children}
    </label>
  );
}

function Select({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: Opt[] }) {
  return (
    <div className="relative">
      <select value={value} onChange={(e) => onChange(e.target.value)}
        className="w-full appearance-none rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2 pr-8 text-sm text-cream transition hover:border-brass/40 focus:border-brass/60 focus:outline-none">
        {options.map((o) => <option key={o.value} value={o.value} className="bg-[#131217]">{o.label}</option>)}
      </select>
      <Icon.chevron className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-cream/40" />
    </div>
  );
}
