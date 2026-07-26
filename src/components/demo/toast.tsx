"use client";

import { createContext, useCallback, useContext, useRef, useState } from "react";

type Toast = { id: number; msg: string; tone: "info" | "success" };
type ToastCtx = { toast: (msg: string, tone?: Toast["tone"]) => void };

const Ctx = createContext<ToastCtx | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<Toast[]>([]);
  const seq = useRef(1);

  const toast = useCallback((msg: string, tone: Toast["tone"] = "info") => {
    const id = seq.current++;
    setItems((xs) => [...xs, { id, msg, tone }]);
    setTimeout(() => setItems((xs) => xs.filter((t) => t.id !== id)), 2600);
  }, []);

  return (
    <Ctx.Provider value={{ toast }}>
      {children}
      <div className="pointer-events-none fixed bottom-5 left-1/2 z-[100] flex -translate-x-1/2 flex-col items-center gap-2">
        {items.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-center gap-2 rounded-full border px-4 py-2 text-sm shadow-2xl backdrop-blur animate-fade-up ${
              t.tone === "success"
                ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-100"
                : "border-brass/30 bg-[#141317]/95 text-cream"
            }`}
          >
            <span className="grid h-4 w-4 place-items-center rounded-full bg-brass/20 text-[10px] text-brass">✓</span>
            {t.msg}
            <span className="text-[11px] text-cream/40">· not saved</span>
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}

export function useToast(): ToastCtx {
  return useContext(Ctx) ?? { toast: () => {} };
}
