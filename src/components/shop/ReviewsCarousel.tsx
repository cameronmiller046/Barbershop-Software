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
        <div className="mt-6 flex justify-center">
          <div className="flex flex-col items-center gap-3 rounded-3xl border border-brass/25 bg-gradient-to-b from-brass/[0.08] to-transparent px-8 py-7 text-center sm:flex-row sm:gap-6 sm:px-10">
            <div className="flex flex-col items-center">
              <span className="font-display text-5xl font-semibold text-cream sm:text-6xl">{rating.toFixed(1)}</span>
              <div className="mt-1 flex items-center gap-0.5 text-brass">
                {Array.from({ length: 5 }).map((_, i) => {
                  const fill = Math.max(0, Math.min(1, rating - i));
                  return (
                    <span key={i} className="relative inline-block h-5 w-5">
                      <Icon.star className="absolute inset-0 h-5 w-5 opacity-20" />
                      <span className="absolute inset-0 overflow-hidden" style={{ width: `${fill * 100}%` }}><Icon.star className="h-5 w-5" /></span>
                    </span>
                  );
                })}
              </div>
            </div>
            <div className="hidden h-16 w-px bg-white/10 sm:block" />
            <div className="sm:text-left">
              <div className="font-display text-2xl text-cream">{count.toLocaleString()} reviews</div>
              <div className="mt-1 inline-flex items-center gap-1.5 text-sm text-cream/55">
                <GoogleG /> Verified on Google
              </div>
            </div>
          </div>
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

function GoogleG() {
  return (
    <svg width="14" height="14" viewBox="0 0 48 48" aria-hidden="true" className="shrink-0">
      <path fill="#4285F4" d="M45.12 24.5c0-1.56-.14-3.06-.4-4.5H24v8.51h11.84c-.51 2.75-2.06 5.08-4.39 6.64v5.52h7.11c4.16-3.83 6.56-9.47 6.56-16.17z" />
      <path fill="#34A853" d="M24 46c5.94 0 10.92-1.97 14.56-5.33l-7.11-5.52c-1.97 1.32-4.49 2.1-7.45 2.1-5.73 0-10.58-3.87-12.31-9.07H4.34v5.7C7.96 41.07 15.4 46 24 46z" />
      <path fill="#FBBC05" d="M11.69 28.18C11.25 26.86 11 25.45 11 24s.25-2.86.69-4.18v-5.7H4.34C2.85 17.09 2 20.45 2 24s.85 6.91 2.34 9.88l7.35-5.7z" />
      <path fill="#EA4335" d="M24 10.75c3.23 0 6.13 1.11 8.41 3.29l6.31-6.31C34.91 4.18 29.93 2 24 2 15.4 2 7.96 6.93 4.34 14.12l7.35 5.7c1.73-5.2 6.58-9.07 12.31-9.07z" />
    </svg>
  );
}
