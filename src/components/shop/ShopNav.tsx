"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { motion, useMotionValueEvent, useScroll } from "framer-motion";

export type NavLink = { href: string; label: string; exact?: boolean };

export function ShopNav({ shopName, logoUrl, home, links, bookHref }: { shopName: string; logoUrl: string | null; home: string; links: NavLink[]; bookHref: string }) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const { scrollY } = useScroll();
  useMotionValueEvent(scrollY, "change", (y) => setScrolled(y > 24));

  const brandBtn = { background: "var(--brand)", color: "var(--brand-fg)" } as React.CSSProperties;
  const active = (l: NavLink) => (l.exact ? pathname === l.href : pathname === l.href || pathname.startsWith(l.href + "/"));

  return (
    <motion.header
      initial={{ y: -24, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.6, ease: [0.2, 0.7, 0.2, 1] }}
      className="fixed inset-x-0 top-0 z-50 flex justify-center px-4"
    >
      <motion.nav
        animate={{ marginTop: scrolled ? 10 : 18, paddingTop: scrolled ? 8 : 11, paddingBottom: scrolled ? 8 : 11, width: scrolled ? "min(70rem,100%)" : "min(78rem,100%)" }}
        transition={{ type: "spring", stiffness: 260, damping: 30 }}
        className="glass-nav flex items-center justify-between gap-4 rounded-full px-4 sm:px-6"
      >
        <Link href={home} className="flex items-center gap-2.5">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt={shopName} className="h-9 w-9 rounded-full object-cover ring-1 ring-brass/40" />
          ) : (
            <span className="grid h-9 w-9 place-items-center rounded-full font-display text-sm font-bold" style={brandBtn}>{shopName.charAt(0)}</span>
          )}
          <span className="hidden font-display text-[17px] tracking-tight text-cream sm:block">{shopName}</span>
        </Link>

        <div className="hidden items-center gap-0.5 lg:flex">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className={`rounded-full px-3 py-2 text-sm transition hover:bg-white/5 ${active(l) ? "text-brass" : "text-cream/70 hover:text-cream"}`}>{l.label}</Link>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <Link href={bookHref} className="hidden rounded-full px-4 py-2 text-sm font-semibold shadow-lg transition hover:brightness-105 sm:inline-flex" style={brandBtn}>Book Appointment</Link>
          <button aria-label="Menu" onClick={() => setOpen((o) => !o)} className="grid h-9 w-9 place-items-center rounded-full border border-white/10 text-cream lg:hidden">
            <span className="relative block h-3 w-4">
              <span className={`absolute left-0 top-0 h-0.5 w-4 bg-current transition ${open ? "translate-y-1.5 rotate-45" : ""}`} />
              <span className={`absolute left-0 top-1.5 h-0.5 w-4 bg-current transition ${open ? "opacity-0" : ""}`} />
              <span className={`absolute left-0 top-3 h-0.5 w-4 bg-current transition ${open ? "-translate-y-1.5 -rotate-45" : ""}`} />
            </span>
          </button>
        </div>
      </motion.nav>

      {open && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="glass-nav absolute top-[68px] w-[calc(100%-2rem)] rounded-3xl p-3 lg:hidden">
          {links.map((l) => (
            <Link key={l.href} href={l.href} onClick={() => setOpen(false)} className={`block rounded-xl px-4 py-3 text-sm hover:bg-white/5 ${active(l) ? "text-brass" : "text-cream/80"}`}>{l.label}</Link>
          ))}
          <Link href={bookHref} onClick={() => setOpen(false)} className="mt-1 block rounded-xl px-4 py-3 text-center text-sm font-semibold" style={brandBtn}>Book Appointment</Link>
        </motion.div>
      )}
    </motion.header>
  );
}
