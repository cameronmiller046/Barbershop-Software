"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";

export type Shot = { src: string; alt: string };

export function ShopGallery({ shots }: { shots: Shot[] }) {
  const [open, setOpen] = useState<number | null>(null);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (open === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(null);
      if (e.key === "ArrowRight") setOpen((i) => (i === null ? null : (i + 1) % shots.length));
      if (e.key === "ArrowLeft") setOpen((i) => (i === null ? null : (i - 1 + shots.length) % shots.length));
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [open, shots.length]);

  return (
    <>
      <div className="mt-10 columns-2 gap-3 sm:columns-3 lg:columns-4 [&>*]:mb-3">
        {shots.map((s, i) => (
          <motion.button key={i} onClick={() => setOpen(i)}
            initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-60px" }} transition={{ duration: 0.5, delay: (i % 4) * 0.05 }}
            className="group relative block w-full overflow-hidden rounded-2xl border border-white/8">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={s.src} alt={s.alt} loading="lazy" className={`w-full object-cover transition duration-500 group-hover:scale-105 ${i % 3 === 0 ? "aspect-[3/4]" : i % 3 === 1 ? "aspect-square" : "aspect-[4/5]"}`} />
            <span className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 transition group-hover:opacity-100" />
          </motion.button>
        ))}
      </div>

      {mounted && createPortal(
        <AnimatePresence>
          {open !== null && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] grid place-items-center bg-black/90 p-4 backdrop-blur-sm" onClick={() => setOpen(null)}>
              <button aria-label="Close" className="absolute right-5 top-5 text-2xl text-cream/70 hover:text-cream" onClick={() => setOpen(null)}>✕</button>
              <button aria-label="Previous" className="absolute left-4 text-3xl text-cream/50 hover:text-cream" onClick={(e) => { e.stopPropagation(); setOpen((i) => (i === null ? null : (i - 1 + shots.length) % shots.length)); }}>‹</button>
              <motion.img key={open} initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.25 }}
                src={shots[open].src} alt={shots[open].alt} className="max-h-[85vh] max-w-[90vw] rounded-2xl object-contain shadow-2xl" onClick={(e) => e.stopPropagation()} />
              <button aria-label="Next" className="absolute right-4 text-3xl text-cream/50 hover:text-cream" onClick={(e) => { e.stopPropagation(); setOpen((i) => (i === null ? null : (i + 1) % shots.length)); }}>›</button>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </>
  );
}
