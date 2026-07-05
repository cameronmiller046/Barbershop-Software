"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { PRESETS } from "@/lib/reportRange";
import { Icon } from "@/components/home/icons";

export function DatePreset({ current }: { current: string }) {
  const router = useRouter();
  const sp = useSearchParams();
  const [open, setOpen] = useState(false);
  const [showCustom, setShowCustom] = useState(current === "custom");
  const label = PRESETS.find((p) => p[0] === current)?.[1] ?? "Last 30 Days";

  const pick = (key: string) => {
    setOpen(false);
    if (key === "custom") { setShowCustom(true); return; }
    setShowCustom(false);
    router.push(`/portal/reports?preset=${key}`);
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative">
        <button onClick={() => setOpen((o) => !o)} className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.02] px-3.5 py-2.5 text-sm text-cream transition hover:border-brass/40">
          <Icon.calendar className="h-4 w-4 text-brass" /> {label} <Icon.chevron className="h-3.5 w-3.5 -rotate-90 text-cream/40" />
        </button>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <div className="p-scroll absolute right-0 z-50 mt-2 grid max-h-[60vh] w-64 grid-cols-2 gap-1 overflow-y-auto rounded-2xl border border-white/10 bg-[#131217] p-2 shadow-2xl">
              {PRESETS.map(([key, lbl]) => (
                <button key={key} onClick={() => pick(key)} className={`rounded-lg px-3 py-2 text-left text-xs transition ${current === key ? "bg-brass/15 text-brass" : "text-cream/70 hover:bg-white/5"}`}>{lbl}</button>
              ))}
            </div>
          </>
        )}
      </div>

      {showCustom && (
        <form onSubmit={(e) => { e.preventDefault(); const fd = new FormData(e.currentTarget); router.push(`/portal/reports?preset=custom&from=${fd.get("from")}&to=${fd.get("to")}`); }} className="flex items-center gap-2">
          <input name="from" type="date" defaultValue={sp.get("from") ?? ""} className="rounded-lg border border-white/10 bg-white/[0.02] px-2 py-2 text-sm text-cream" />
          <span className="text-cream/40">–</span>
          <input name="to" type="date" defaultValue={sp.get("to") ?? ""} className="rounded-lg border border-white/10 bg-white/[0.02] px-2 py-2 text-sm text-cream" />
          <button className="p-btn-gold !py-2 text-sm">Apply</button>
        </form>
      )}
    </div>
  );
}
