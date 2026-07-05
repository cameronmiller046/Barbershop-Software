"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { formatMoney, formatDuration } from "@/lib/utils";
import { Icon } from "@/components/home/icons";
import { QMARK } from "@/lib/placeholder";

export type Svc = { id: string; name: string; description: string | null; durationMin: number; priceCents: number; imageUrl: string | null; barberName: string | null };

const ORDER = ["Haircuts", "Beard", "Women's", "Kids", "Color", "Premium"];

function categoryOf(name: string): string {
  const n = name.toLowerCase();
  if (/package|combo|deluxe|premium|vip|the works|signature/.test(n)) return "Premium";
  if (/color|dye|highlight|tint|bleach/.test(n)) return "Color";
  if (/beard|shave|line[- ]?up|razor|mustache/.test(n)) return "Beard";
  if (/kid|child|junior|boy/.test(n)) return "Kids";
  if (/women|silk|press|blowout|braid|weave/.test(n)) return "Women's";
  return "Haircuts";
}

export function ShopServices({ services, bookBase }: { services: Svc[]; bookBase: string }) {
  const withCat = useMemo(() => services.map((s) => ({ ...s, cat: categoryOf(s.name) })), [services]);
  const cats = useMemo(() => {
    const present = new Set(withCat.map((s) => s.cat));
    return ["All", ...ORDER.filter((c) => present.has(c))];
  }, [withCat]);
  const [active, setActive] = useState("All");
  const shown = active === "All" ? withCat : withCat.filter((s) => s.cat === active);

  return (
    <div>
      {cats.length > 2 && (
        <div className="mt-8 flex flex-wrap justify-center gap-2">
          {cats.map((c) => (
            <button key={c} onClick={() => setActive(c)}
              className={`rounded-full border px-4 py-2 text-sm transition ${active === c ? "border-brass/60 bg-brass/12 text-brass" : "border-white/12 text-cream/60 hover:border-white/25 hover:text-cream"}`}>
              {c}
            </button>
          ))}
        </div>
      )}

      <motion.div layout className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <AnimatePresence mode="popLayout">
          {shown.map((s) => (
            <motion.div key={s.id} layout initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96 }} transition={{ duration: 0.35, ease: [0.2, 0.7, 0.2, 1] }}
              className="group flex flex-col overflow-hidden rounded-2xl border border-white/8 bg-white/[0.02] transition hover:border-brass/40">
              <div className="relative aspect-[16/10] overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={s.imageUrl || QMARK} alt={s.name} loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
                <span className="absolute left-3 top-3 rounded-full bg-black/50 px-2.5 py-1 text-[10px] font-medium uppercase tracking-wide text-cream/80 backdrop-blur">{s.cat}</span>
              </div>
              <div className="flex flex-1 flex-col p-5">
                <div className="flex items-baseline justify-between gap-3">
                  <h3 className="font-display text-lg text-cream">{s.name}</h3>
                  <span className="whitespace-nowrap font-display text-lg text-brass">{formatMoney(s.priceCents)}</span>
                </div>
                {s.description && <p className="mt-1.5 line-clamp-2 flex-1 text-sm text-cream/55">{s.description}</p>}
                <div className="mt-3 flex items-center gap-2 text-xs text-cream/45">
                  <span className="inline-flex items-center gap-1"><Icon.clock className="h-3.5 w-3.5" /> {formatDuration(s.durationMin)}</span>
                  {s.barberName && <span>· with {s.barberName}</span>}
                </div>
                <a href={`${bookBase}?service=${s.id}`} className="mt-4 rounded-full py-2.5 text-center text-sm font-semibold shadow-lg transition hover:brightness-105" style={{ background: "var(--brand)", color: "var(--brand-fg)" }}>Book Now</a>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
