"use client";

import { useRef, useState } from "react";

// Drag on a card-shaped preview to choose the focal point (CSS object-position)
// of a service photo, so it stays centered on the subject. Opens in a small
// modal for precision; saves via a one-field server action.
export function ServiceFocusPicker({
  imageUrl, initial, action,
}: {
  imageUrl: string;
  initial: string;
  action: (formData: FormData) => void | Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState(initial || "50% 50%");
  const boxRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const hiddenRef = useRef<HTMLInputElement>(null);
  const dragging = useRef(false);
  const latest = useRef(initial || "50% 50%");

  const [px, py] = pos.split(" ").map((s) => parseInt(s, 10) || 50);

  function update(e: React.PointerEvent) {
    const box = boxRef.current;
    if (!box) return;
    const r = box.getBoundingClientRect();
    const x = Math.round(Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)) * 100);
    const y = Math.round(Math.min(1, Math.max(0, (e.clientY - r.top) / r.height)) * 100);
    const next = `${x}% ${y}%`;
    latest.current = next;
    setPos(next);
  }
  function save() {
    if (hiddenRef.current) hiddenRef.current.value = latest.current;
    formRef.current?.requestSubmit();
    setOpen(false);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-full border border-white/10 px-3 py-1.5 text-xs text-cream/70 hover:bg-white/5"
      >
        Adjust focus
      </button>

      {open && (
        <div className="fixed inset-0 z-[95] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70" onClick={() => setOpen(false)} />
          <div className="relative w-full max-w-md rounded-2xl border border-white/10 bg-charcoal p-5 shadow-2xl">
            <h3 className="font-display text-lg text-cream">Adjust photo focus</h3>
            <p className="mt-1 text-xs text-cream/50">Drag to pick what stays centered on the service card.</p>
            <div
              ref={boxRef}
              onPointerDown={(e) => { dragging.current = true; (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); update(e); }}
              onPointerMove={(e) => { if (dragging.current) update(e); }}
              onPointerUp={() => { dragging.current = false; }}
              className="relative mt-4 aspect-[16/10] w-full cursor-crosshair touch-none select-none overflow-hidden rounded-lg border border-white/10"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={imageUrl} alt="Service photo" className="pointer-events-none h-full w-full object-cover" style={{ objectPosition: pos }} />
              <div
                className="pointer-events-none absolute h-7 w-7 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_0_0_2px_rgba(0,0,0,0.5)]"
                style={{ left: `${px}%`, top: `${py}%` }}
              />
            </div>
            <form ref={formRef} action={action}>
              <input ref={hiddenRef} type="hidden" name="position" defaultValue={pos} />
            </form>
            <div className="mt-4 flex items-center justify-between">
              <span className="text-xs text-cream/40">{pos}</span>
              <div className="flex gap-2">
                <button type="button" onClick={() => setOpen(false)} className="btn-ghost px-3 py-1.5 text-xs">Cancel</button>
                <button type="button" onClick={save} className="rounded-full px-4 py-1.5 text-xs font-semibold text-[var(--brand-fg)]" style={{ background: "var(--brand)" }}>Save focus</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
