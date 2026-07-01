"use client";

import { useRef, useState } from "react";

// Drag anywhere on the hero preview to choose which part of the photo stays in
// frame (CSS object-position). Saves on release via a one-field server action.
export function HeroFocusPicker({
  src, initial, action,
}: {
  src: string;
  initial: string;
  action: (formData: FormData) => void | Promise<void>;
}) {
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
  }

  return (
    <div>
      <div
        ref={boxRef}
        onPointerDown={(e) => { dragging.current = true; (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); update(e); }}
        onPointerMove={(e) => { if (dragging.current) update(e); }}
        onPointerUp={() => { dragging.current = false; save(); }}
        className="relative h-40 w-full cursor-crosshair touch-none select-none overflow-hidden rounded-lg border border-white/10"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt="Hero preview" className="pointer-events-none h-full w-full object-cover" style={{ objectPosition: pos }} />
        <div
          className="pointer-events-none absolute h-7 w-7 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_0_0_2px_rgba(0,0,0,0.5)]"
          style={{ left: `${px}%`, top: `${py}%` }}
        />
      </div>
      <form ref={formRef} action={action}>
        <input ref={hiddenRef} type="hidden" name="position" defaultValue={pos} />
      </form>
      <p className="mt-1 text-xs text-cream/40">Drag on the photo to center it where you want ({pos}).</p>
    </div>
  );
}
