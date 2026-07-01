"use client";

import { useState } from "react";

// Two-color theme editor with presets + a live preview. Emits hidden inputs
// (primaryColor / secondaryColor) inside the Settings form. Colors apply to
// both the public shop site and the store's portal.
const PRESETS: { name: string; primary: string; secondary: string }[] = [
  { name: "Classic gold", primary: "#c9a24b", secondary: "#c9a24b" },
  { name: "Barber red", primary: "#d1233a", secondary: "#e8b84b" },
  { name: "Emerald", primary: "#10b981", secondary: "#f5f1e8" },
  { name: "Royal", primary: "#7c5cff", secondary: "#e0b64b" },
  { name: "Steel", primary: "#3b82f6", secondary: "#e5e7eb" },
  { name: "Rose", primary: "#f43f5e", secondary: "#f5c86b" },
];

const isHex = (v: string) => /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(v);

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <div className="label">{label}</div>
      <div className="flex items-center gap-2">
        <input type="color" value={isHex(value) ? value : "#000000"} onChange={(e) => onChange(e.target.value)}
          className="h-10 w-12 shrink-0 rounded-lg border border-white/10 bg-smoke" />
        <input value={value} onChange={(e) => onChange(e.target.value)} spellCheck={false}
          className={`input font-mono ${isHex(value) ? "" : "border-red-500/50"}`} />
      </div>
    </div>
  );
}

export function SiteColors({ initialPrimary, initialSecondary }: { initialPrimary: string; initialSecondary: string }) {
  const [primary, setPrimary] = useState(initialPrimary || "#c9a24b");
  const [secondary, setSecondary] = useState(initialSecondary || initialPrimary || "#c9a24b");

  return (
    <div className="space-y-4">
      <input type="hidden" name="primaryColor" value={isHex(primary) ? primary : "#c9a24b"} />
      <input type="hidden" name="secondaryColor" value={isHex(secondary) ? secondary : primary} />

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Primary — buttons & CTAs" value={primary} onChange={setPrimary} />
        <Field label="Accent — headings & highlights" value={secondary} onChange={setSecondary} />
      </div>

      <div>
        <div className="label">Presets</div>
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((p) => (
            <button key={p.name} type="button" title={p.name}
              onClick={() => { setPrimary(p.primary); setSecondary(p.secondary); }}
              className="flex items-center gap-1.5 rounded-full border border-white/10 px-2.5 py-1 text-xs text-cream/70 hover:bg-white/5">
              <span className="h-3 w-3 rounded-full" style={{ background: p.primary }} />
              <span className="h-3 w-3 rounded-full" style={{ background: p.secondary }} />
              {p.name}
            </button>
          ))}
        </div>
      </div>

      {/* Live preview on the shop's black base */}
      <div>
        <div className="label">Preview</div>
        <div className="rounded-xl border border-white/10 p-5" style={{ background: "#0f0f10" }}>
          <div className="font-display text-xl" style={{ color: secondary }}>Fresh cuts, every day</div>
          <p className="mt-1 text-sm text-cream/70">Book your next appointment in seconds.</p>
          <div className="mt-3 flex items-center gap-2">
            <span className="rounded-full px-4 py-1.5 text-sm font-semibold" style={{ background: primary, color: "#0f0f10" }}>Book now</span>
            <span className="rounded-full border px-3 py-1 text-xs" style={{ borderColor: secondary, color: secondary }}>Skin Fade · $40</span>
          </div>
        </div>
      </div>
      <p className="text-xs text-cream/40">Applies to your public site <span className="text-cream/60">and</span> your portal.</p>
    </div>
  );
}
