"use client";

import { useState } from "react";
import { motion } from "framer-motion";

export type Qa = { q: string; a: string };

export function Faq({ columns, gridClassName = "grid gap-4 md:grid-cols-2 lg:grid-cols-3" }: { columns: Qa[][]; gridClassName?: string }) {
  return (
    <div className={gridClassName}>
      {columns.map((col, i) => (
        <div key={i} className="space-y-4">
          {col.map((qa) => <FaqItem key={qa.q} {...qa} />)}
        </div>
      ))}
    </div>
  );
}

function FaqItem({ q, a }: Qa) {
  const [open, setOpen] = useState(false);
  return (
    <div className="overflow-hidden rounded-2xl border border-white/8 bg-white/[0.02] transition hover:border-brass/25">
      <button onClick={() => setOpen((o) => !o)} aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left">
        <span className="text-sm font-medium text-cream">{q}</span>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
          className={`shrink-0 text-brass transition-transform duration-300 ${open ? "rotate-180" : ""}`}>
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>
      <motion.div initial={false} animate={{ height: open ? "auto" : 0, opacity: open ? 1 : 0 }} transition={{ duration: 0.28, ease: [0.2, 0.7, 0.2, 1] }} className="overflow-hidden">
        <p className="px-5 pb-4 text-sm leading-relaxed text-cream/60">{a}</p>
      </motion.div>
    </div>
  );
}
