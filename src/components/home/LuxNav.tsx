"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { motion, useMotionValueEvent, useScroll } from "framer-motion";

const LINKS = [
  { href: "/features", label: "Features" },
  { href: "/pricing", label: "Pricing" },
  { href: "/how-it-works", label: "How It Works" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

export function LuxNav() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const { scrollY } = useScroll();
  useMotionValueEvent(scrollY, "change", (y) => setScrolled(y > 24));

  return (
    <motion.header
      initial={{ y: -24, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: [0.2, 0.7, 0.2, 1] }}
      className="fixed inset-x-0 top-0 z-50 flex justify-center px-4"
    >
      <motion.nav
        animate={{
          marginTop: scrolled ? 10 : 20,
          paddingTop: scrolled ? 8 : 12,
          paddingBottom: scrolled ? 8 : 12,
          width: scrolled ? "min(64rem, 100%)" : "min(72rem, 100%)",
        }}
        transition={{ type: "spring", stiffness: 260, damping: 30 }}
        className="glass-nav flex items-center justify-between gap-4 rounded-full px-4 sm:px-6"
      >
        <Link href="/" className="flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-[#f4d585] to-[#b98a3c] text-[#17130a]">
            <ChairMark />
          </span>
          <span className="leading-none">
            <span className="block font-display text-[17px] tracking-tight text-cream">The Chair</span>
            <span className="block text-[9px] uppercase tracking-[0.22em] text-brass/70">Barbershop Software</span>
          </span>
        </Link>

        <div className="hidden items-center gap-1 lg:flex">
          {LINKS.map((l) => {
            const active = l.href.startsWith("/") && (pathname === l.href || pathname.startsWith(l.href + "/"));
            return (
              <Link key={l.href} href={l.href}
                className={`rounded-full px-3.5 py-2 text-sm transition hover:bg-white/5 ${active ? "text-brass" : "text-cream/70 hover:text-cream"}`}>
                {l.label}
              </Link>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          <Link href="/login" className="hidden rounded-full border border-white/15 px-4 py-2 text-sm text-cream/90 transition hover:border-brass/50 hover:text-cream sm:inline-flex">
            Login
          </Link>
          <Link href="/signup" className="btn-gold !py-2 !px-4 text-sm">Get Started Free</Link>
          <button
            aria-label="Menu" onClick={() => setOpen((o) => !o)}
            className="grid h-9 w-9 place-items-center rounded-full border border-white/10 text-cream lg:hidden"
          >
            <span className="relative block h-3 w-4">
              <span className={`absolute left-0 top-0 h-0.5 w-4 bg-current transition ${open ? "translate-y-1.5 rotate-45" : ""}`} />
              <span className={`absolute left-0 top-1.5 h-0.5 w-4 bg-current transition ${open ? "opacity-0" : ""}`} />
              <span className={`absolute left-0 top-3 h-0.5 w-4 bg-current transition ${open ? "-translate-y-1.5 -rotate-45" : ""}`} />
            </span>
          </button>
        </div>
      </motion.nav>

      {open && (
        <motion.div
          initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
          className="glass-nav absolute top-[72px] w-[calc(100%-2rem)] rounded-3xl p-3 lg:hidden"
        >
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} onClick={() => setOpen(false)}
              className="block rounded-xl px-4 py-3 text-sm text-cream/80 hover:bg-white/5">{l.label}</Link>
          ))}
          <Link href="/login" onClick={() => setOpen(false)} className="block rounded-xl px-4 py-3 text-sm text-cream/80 hover:bg-white/5">Login</Link>
        </motion.div>
      )}
    </motion.header>
  );
}

function ChairMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 10V6a2 2 0 0 1 2-2h1M18 10V6a2 2 0 0 0-2-2h-1" />
      <rect x="5" y="10" width="14" height="6" rx="1.5" />
      <path d="M7 16v4M17 16v4M4 20h16" />
    </svg>
  );
}
