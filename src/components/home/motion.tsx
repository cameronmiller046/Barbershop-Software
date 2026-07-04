"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useInView, useReducedMotion, type Variants } from "framer-motion";

const EASE = [0.2, 0.7, 0.2, 1] as const;

/** Fade + rise into view once. */
export function Reveal({
  children, delay = 0, y = 26, className, as = "div",
}: {
  children: React.ReactNode; delay?: number; y?: number; className?: string; as?: "div" | "section" | "span";
}) {
  const reduce = useReducedMotion();
  const MotionTag = motion[as];
  return (
    <MotionTag
      className={className}
      initial={reduce ? false : { opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.7, ease: EASE, delay }}
    >
      {children}
    </MotionTag>
  );
}

/** Parent that staggers its <Item> children as they enter. */
export function Stagger({
  children, className, gap = 0.09, as = "div",
}: {
  children: React.ReactNode; className?: string; gap?: number; as?: "div" | "ul";
}) {
  const MotionTag = motion[as];
  const variants: Variants = { hidden: {}, show: { transition: { staggerChildren: gap } } };
  return (
    <MotionTag className={className} variants={variants} initial="hidden" whileInView="show" viewport={{ once: true, margin: "-70px" }}>
      {children}
    </MotionTag>
  );
}

export function Item({ children, className, y = 22, as = "div" }: { children: React.ReactNode; className?: string; y?: number; as?: "div" | "li" }) {
  const reduce = useReducedMotion();
  const MotionTag = motion[as];
  const variants: Variants = {
    hidden: reduce ? {} : { opacity: 0, y },
    show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE } },
  };
  return <MotionTag className={className} variants={variants}>{children}</MotionTag>;
}

/** Hover-lift wrapper. */
export function Lift({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.div className={className} whileHover={{ y: -6 }} transition={{ type: "spring", stiffness: 300, damping: 22 }}>
      {children}
    </motion.div>
  );
}

/** Count-up number, triggered when scrolled into view. */
export function Counter({
  to, duration = 1.8, prefix = "", suffix = "", decimals = 0, className,
}: {
  to: number; duration?: number; prefix?: string; suffix?: string; decimals?: number; className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  const reduce = useReducedMotion();
  const [val, setVal] = useState(0);

  useEffect(() => {
    if (!inView) return;
    if (reduce) { setVal(to); return; }
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / (duration * 1000));
      const eased = 1 - Math.pow(1 - t, 3);
      setVal(to * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, to, duration, reduce]);

  const shown = val.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  return <span ref={ref} className={className}>{prefix}{shown}{suffix}</span>;
}

export { motion };
