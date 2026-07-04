"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Icon } from "@/components/home/icons";

export type Review = { id: string; authorName: string; rating: number; body: string };

export function ReviewsCarousel({ reviews, rating, count }: { reviews: Review[]; rating: number | null; count: number }) {
  // Group into pages of up to 3 for desktop; carousel steps by page.
  const perPage = 3;
  const pages = Math.max(1, Math.ceil(reviews.length / perPage));
  const [page, setPage] = useState(0);
  const [dir, setDir] = useState(1);
  const go = (d: number) => { setDir(d); setPage((p) => (p + d + pages) % pages); };
  const slice = reviews.slice(page * perPage, page * perPage + perPage);

  return (
    <div>
      {rating != null && (
        <div className="mt-6 flex flex-col items-center gap-2">
          <div className="flex items-center gap-1 text-brass">
            {Array.from({ length: 5 }).map((_, i) => <Icon.star key={i} className={`h-6 w-6 ${i < Math.round(rating) ? "" : "opacity-25"}`} />)}
          </div>
          <div className="text-cream/70"><span className="font-display text-2xl text-cream">{rating.toFixed(1)}</span> · {count.toLocaleString()} Google reviews</div>
        </div>
      )}

      <div className="relative mt-10 overflow-hidden">
        <AnimatePresence mode="wait" custom={dir}>
          <motion.div key={page} custom={dir}
            initial={{ opacity: 0, x: dir * 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: dir * -40 }} transition={{ duration: 0.35, ease: [0.2, 0.7, 0.2, 1] }}
            className="grid gap-5 md:grid-cols-3">
            {slice.map((r) => (
              <figure key={r.id} className="lux-card flex h-full flex-col p-7">
                <div className="flex gap-1 text-brass">{Array.from({ length: 5 }).map((_, i) => <Icon.star key={i} className={`h-4 w-4 ${i < r.rating ? "" : "opacity-25"}`} />)}</div>
                <blockquote className="mt-4 flex-1 text-[15px] leading-relaxed text-cream/80">“{r.body}”</blockquote>
                <figcaption className="mt-6 flex items-center gap-3">
                  <span className="grid h-11 w-11 place-items-center rounded-full bg-brass/15 text-sm font-semibold text-brass">{initials(r.authorName)}</span>
                  <span><span className="block text-sm font-semibold text-cream">{r.authorName}</span><span className="block text-xs text-cream/45">Verified client</span></span>
                </figcaption>
              </figure>
            ))}
          </motion.div>
        </AnimatePresence>
      </div>

      {pages > 1 && (
        <div className="mt-8 flex items-center justify-center gap-4">
          <button aria-label="Previous reviews" onClick={() => go(-1)} className="grid h-10 w-10 place-items-center rounded-full border border-white/12 text-cream/70 transition hover:border-brass/50 hover:text-brass">‹</button>
          <div className="flex gap-1.5">
            {Array.from({ length: pages }).map((_, i) => (
              <button key={i} aria-label={`Page ${i + 1}`} onClick={() => { setDir(i > page ? 1 : -1); setPage(i); }} className={`h-1.5 rounded-full transition-all ${i === page ? "w-6 bg-brass" : "w-1.5 bg-white/20"}`} />
            ))}
          </div>
          <button aria-label="Next reviews" onClick={() => go(1)} className="grid h-10 w-10 place-items-center rounded-full border border-white/12 text-cream/70 transition hover:border-brass/50 hover:text-brass">›</button>
        </div>
      )}
    </div>
  );
}

function initials(name: string) {
  return name.split(" ").map((n) => n[0]).filter(Boolean).slice(0, 2).join("").toUpperCase() || "C";
}
