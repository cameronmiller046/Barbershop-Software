"use client";

import Link from "next/link";
import { Reveal, Stagger, Item, motion } from "@/components/home/motion";
import { DashboardMock } from "@/components/home/mockups";
import { Icon } from "@/components/home/icons";

const TRUST = [
  { icon: Icon.spark, label: "Easy Setup" },
  { icon: Icon.shield, label: "Secure & Reliable" },
  { icon: Icon.scissors, label: "Built for Barbers" },
];

export function Hero() {
  return (
    <section className="relative z-10 mx-auto grid max-w-7xl items-center gap-12 px-5 pb-16 pt-36 sm:pt-40 lg:grid-cols-[1.05fr_1fr] lg:gap-8 lg:pb-28 lg:pt-44">
      {/* Left */}
      <div>
        <Reveal>
          <span className="inline-flex items-center gap-2 rounded-full border border-brass/25 bg-brass/[0.06] px-3.5 py-1.5 text-xs text-brass/90">
            <span className="h-1.5 w-1.5 rounded-full bg-brass" />
            The all-in-one platform for modern barbershops
          </span>
        </Reveal>

        <Reveal delay={0.05}>
          <h1 className="mt-6 font-display text-[2.9rem] font-medium leading-[1.02] tracking-tight text-cream sm:text-6xl xl:text-7xl">
            Run Your Shop.<br />Book More.
            <span className="mt-1 block gold-script text-[3.4rem] font-bold leading-[1.3] pb-[0.22em] sm:text-7xl xl:text-[5.2rem]">
              Grow Every Day.
            </span>
          </h1>
        </Reveal>

        <Reveal delay={0.12}>
          <p className="mt-6 max-w-lg text-lg leading-relaxed text-cream/65">
            The Chair is the all-in-one platform for appointments, customers, staff,
            inventory, payments, and business growth — everything your barbershop needs
            in one beautifully simple place.
          </p>
        </Reveal>

        <Reveal delay={0.18}>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link href="/beta" className="btn-gold text-base">
              Get Started Free <Icon.arrow className="h-4 w-4" />
            </Link>
            <Link href="/t/professional-barbershop" className="btn-outline-gold text-base">
              See it live
            </Link>
          </div>
        </Reveal>

        <Stagger className="mt-9 flex flex-wrap items-center gap-x-6 gap-y-3" gap={0.1}>
          {TRUST.map((t) => (
            <Item key={t.label} className="flex items-center gap-2 text-sm text-cream/60">
              <span className="grid h-7 w-7 place-items-center rounded-full border border-brass/25 bg-brass/[0.06] text-brass">
                <t.icon className="h-4 w-4" />
              </span>
              {t.label}
            </Item>
          ))}
        </Stagger>
      </div>

      {/* Right — floating product visual */}
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.9, ease: [0.2, 0.7, 0.2, 1], delay: 0.2 }}
        className="relative mx-auto w-full max-w-[560px] lg:max-w-none"
      >
        {/* glow */}
        <div className="pointer-events-none absolute -inset-10 -z-10 rounded-[3rem] bg-[radial-gradient(circle_at_50%_40%,rgba(216,178,92,0.22),transparent_65%)] blur-2xl" />

        <div className="lux-float-slow">
          <DashboardMock />
        </div>

        {/* floating cards */}
        <FloatCard className="lux-float -left-4 top-8 sm:-left-10" delay={0.5}>
          <div className="flex items-center gap-2.5">
            <span className="grid h-8 w-8 place-items-center rounded-full bg-emerald-400/15 text-emerald-300">
              <Icon.check className="h-4 w-4" />
            </span>
            <div>
              <div className="text-[11px] font-semibold text-cream">New booking</div>
              <div className="text-[10px] text-cream/50">Fade · 3:30 PM</div>
            </div>
          </div>
        </FloatCard>

        <FloatCard className="lux-float -right-3 top-24 sm:-right-8" delay={0.7}>
          <div className="text-[10px] uppercase tracking-wide text-cream/40">This week</div>
          <div className="mt-0.5 flex items-baseline gap-1.5">
            <span className="text-lg font-bold text-brass">$1,250</span>
            <span className="text-[10px] text-emerald-300">▲ 18%</span>
          </div>
        </FloatCard>

        <FloatCard className="lux-float-slow -left-2 bottom-6 sm:-left-8" delay={0.9}>
          <div className="flex items-center gap-1 text-brass">
            {Array.from({ length: 5 }).map((_, i) => <Icon.star key={i} className="h-3.5 w-3.5" />)}
          </div>
          <div className="mt-1 text-[10px] text-cream/50">“Best booking app.” — 4.9 avg</div>
        </FloatCard>

        <FloatCard className="lux-float bottom-16 right-2 sm:-right-6" delay={1.1}>
          <div className="flex items-center gap-2.5">
            <span className="grid h-8 w-8 place-items-center rounded-full bg-brass/15 text-[11px] font-semibold text-brass">JB</span>
            <div>
              <div className="text-[11px] font-semibold text-cream">James checked in</div>
              <div className="text-[10px] text-cream/50">Waiting · ~5 min</div>
            </div>
          </div>
        </FloatCard>
      </motion.div>
    </section>
  );
}

function FloatCard({ children, className = "", delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.6, ease: [0.2, 0.7, 0.2, 1], delay }}
      className={`glass absolute z-20 hidden rounded-2xl px-3.5 py-2.5 sm:block ${className}`}
    >
      {children}
    </motion.div>
  );
}
