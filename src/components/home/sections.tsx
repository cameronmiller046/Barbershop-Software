"use client";

import Link from "next/link";
import { Reveal, Stagger, Item, Counter, motion } from "@/components/home/motion";
import { Icon, type IconName } from "@/components/home/icons";
import { DashboardMock, PhoneMock, TabletMock } from "@/components/home/mockups";

/* ── shared heading ── */
function Heading({ eyebrow, title, sub, center = true }: { eyebrow: string; title: React.ReactNode; sub?: string; center?: boolean }) {
  return (
    <Reveal className={center ? "mx-auto max-w-2xl text-center" : "max-w-2xl"}>
      <div className="text-xs font-semibold uppercase tracking-[0.24em] text-brass/80">{eyebrow}</div>
      <h2 className="mt-3 font-display text-4xl font-medium tracking-tight text-cream sm:text-[2.7rem]">{title}</h2>
      {sub && <p className="mt-4 text-lg text-cream/60">{sub}</p>}
    </Reveal>
  );
}

/* ═══ Features grid ═══ */
const FEATURES: { icon: IconName; title: string; desc: string }[] = [
  { icon: "booking", title: "Online Booking", desc: "Let clients book 24/7 from a branded page or QR code." },
  { icon: "customers", title: "Customer Management", desc: "Every client, visit, and note in one organized place." },
  { icon: "payments", title: "Payments", desc: "Card, cash, and tips — collected and tracked with ease." },
  { icon: "analytics", title: "Analytics", desc: "See what's working with clear, real-time insights." },
  { icon: "inventory", title: "Inventory", desc: "Track products and supplies before you run out." },
  { icon: "staff", title: "Staff Management", desc: "Manage barbers, schedules, hours, and permissions." },
  { icon: "marketing", title: "Marketing", desc: "Fill your chairs with campaigns and referral tracking." },
  { icon: "loyalty", title: "Loyalty Programs", desc: "Reward regulars and keep them coming back." },
  { icon: "memberships", title: "Memberships", desc: "Recurring plans for predictable monthly revenue." },
  { icon: "reports", title: "Reports", desc: "Owner reports, sales goals, and revenue trends." },
  { icon: "notifications", title: "Notifications", desc: "Automatic reminders that cut no-shows." },
  { icon: "profiles", title: "Customer Profiles", desc: "Preferences and history for a personal touch." },
];

export function Features() {
  return (
    <section id="features" className="relative z-10 mx-auto max-w-7xl px-5 py-24">
      <Heading eyebrow="Powerful Features" title={<>Tools that keep your shop <span className="gold-text">running smooth</span></>} sub="One platform replaces the dozen apps you're juggling today." />
      <Stagger className="mt-14 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3" gap={0.05}>
        {FEATURES.map((f) => {
          const I = Icon[f.icon];
          return (
            <Item key={f.title}>
              <div className="lux-card group h-full p-6">
                <span className="grid h-12 w-12 place-items-center rounded-2xl border border-brass/25 bg-gradient-to-br from-brass/15 to-transparent text-brass transition group-hover:scale-105">
                  <I className="h-6 w-6" />
                </span>
                <h3 className="mt-5 text-lg font-semibold text-cream">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-cream/55">{f.desc}</p>
              </div>
            </Item>
          );
        })}
      </Stagger>
    </section>
  );
}

/* ═══ Product showcase ═══ */
export function Showcase() {
  return (
    <section className="relative z-10 mx-auto max-w-7xl px-5 py-24">
      <Heading eyebrow="See It In Action" title={<>Everything you need, <span className="gold-text">beautifully designed</span></>} sub="Appointment calendars, revenue charts, customer management, and scheduling — on every device." />
      <Reveal delay={0.1} className="relative mx-auto mt-16 max-w-4xl">
        <div className="pointer-events-none absolute -inset-8 -z-10 rounded-[3rem] bg-[radial-gradient(circle_at_50%_40%,rgba(216,178,92,0.14),transparent_70%)] blur-2xl" />
        <div className="relative">
          <DashboardMock />
          <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.2, duration: 0.7 }}
            className="absolute -bottom-10 -left-3 hidden sm:block">
            <PhoneMock />
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.35, duration: 0.7 }}
            className="absolute -right-6 -top-10 hidden lg:block">
            <TabletMock />
          </motion.div>
        </div>
      </Reveal>
    </section>
  );
}

/* ═══ How it works ═══ */
const STEPS: { icon: IconName; step: string; title: string; desc: string }[] = [
  { icon: "userPlus", step: "01", title: "Create Your Account", desc: "Sign up and set up your shop in minutes — no tech skills needed." },
  { icon: "calendar", step: "02", title: "Manage & Book", desc: "Add services and barbers, then accept bookings around the clock." },
  { icon: "growth", step: "03", title: "Grow Your Business", desc: "Happier clients, more bookings, and more revenue every month." },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="relative z-10 mx-auto max-w-6xl px-5 py-24">
      <Heading eyebrow="How It Works" title={<>Get started in <span className="gold-text">3 simple steps</span></>} />
      <div className="relative mt-16">
        {/* Connector sits ABOVE the grid (not inside it) and is forced absolute
            so .lux-connector's position:relative can't make it a grid cell. */}
        <div className="lux-connector !absolute left-[16%] right-[16%] top-8 z-0 hidden md:block" />
        <div className="grid gap-10 md:grid-cols-3">
        {STEPS.map((s, i) => {
          const I = Icon[s.icon];
          return (
            <Reveal key={s.step} delay={i * 0.12} className="relative text-center">
              <div className="relative z-10 mx-auto grid h-16 w-16 place-items-center rounded-full border border-brass/30 bg-[#0d0c0f] text-brass shadow-[0_0_0_6px_rgba(216,178,92,0.06)]">
                <I className="h-7 w-7" />
                <span className="absolute -right-1 -top-1 grid h-6 w-6 place-items-center rounded-full bg-gradient-to-br from-[#f4d585] to-[#b98a3c] text-[10px] font-bold text-[#17130a]">{s.step}</span>
              </div>
              <h3 className="mt-6 text-xl font-semibold text-cream">{s.title}</h3>
              <p className="mx-auto mt-2 max-w-xs text-sm text-cream/55">{s.desc}</p>
            </Reveal>
          );
        })}
        </div>
      </div>
    </section>
  );
}

/* ═══ Stats ═══ */
export function Stats() {
  const items = [
    { el: <><Counter to={1} suffix="K+" /></>, label: "Barbershops using The Chair" },
    { el: <><Counter to={50} suffix="K+" /></>, label: "Appointments booked" },
    { el: <><Counter to={2} prefix="$" suffix="M+" /></>, label: "Revenue processed" },
    { el: <>24/7</>, label: "Support & uptime" },
  ];
  return (
    <section className="relative z-10 mx-auto max-w-6xl px-5 py-16">
      <div className="glass grid grid-cols-2 gap-6 rounded-3xl px-6 py-10 sm:px-10 md:grid-cols-4">
        {items.map((s, i) => (
          <Reveal key={i} delay={i * 0.08} className="text-center">
            <div className="gold-text font-display text-4xl font-bold sm:text-5xl">{s.el}</div>
            <div className="mt-2 text-xs text-cream/55 sm:text-sm">{s.label}</div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

/* ═══ Testimonials ═══ */
const REVIEWS = [
  { name: "Marcus Bell", shop: "Fresh Cuts, Atlanta", initials: "MB", tone: "#d8b25c", quote: "The Chair replaced three apps. Bookings are up 40% and no-shows basically vanished." },
  { name: "Andre Foster", shop: "Legends Barber Co.", initials: "AF", tone: "#c98a3c", quote: "Setup took an afternoon. My barbers love the schedule and clients love booking online." },
  { name: "Chris Nguyen", shop: "Fade City", initials: "CN", tone: "#e0b352", quote: "The reports finally show me what's actually making money. It runs the whole shop." },
];

export function Testimonials() {
  return (
    <section className="relative z-10 mx-auto max-w-7xl px-5 py-24">
      <Heading eyebrow="Loved By Barbers" title={<>Trusted by shops <span className="gold-text">across the country</span></>} />
      <Stagger className="mt-14 grid gap-5 md:grid-cols-3" gap={0.1}>
        {REVIEWS.map((r) => (
          <Item key={r.name}>
            <figure className="lux-card h-full p-7">
              <div className="flex gap-1 text-brass">{Array.from({ length: 5 }).map((_, i) => <Icon.star key={i} className="h-4 w-4" />)}</div>
              <blockquote className="mt-4 text-[15px] leading-relaxed text-cream/80">“{r.quote}”</blockquote>
              <figcaption className="mt-6 flex items-center gap-3">
                <span className="grid h-11 w-11 place-items-center rounded-full text-sm font-semibold" style={{ background: `${r.tone}22`, color: r.tone }}>{r.initials}</span>
                <span><span className="block text-sm font-semibold text-cream">{r.name}</span><span className="block text-xs text-cream/50">{r.shop}</span></span>
              </figcaption>
            </figure>
          </Item>
        ))}
      </Stagger>
    </section>
  );
}

/* ═══ Integrations ═══ */
const TOOLS = ["Stripe", "Square", "Apple Pay", "Google", "Mailchimp", "QuickBooks", "Instagram", "Twilio"];
export function Integrations() {
  return (
    <section className="relative z-10 mx-auto max-w-5xl px-5 py-16 text-center">
      <Reveal>
        <div className="text-xs font-semibold uppercase tracking-[0.24em] text-cream/40">Works with the tools you already use</div>
      </Reveal>
      <Stagger className="mt-8 flex flex-wrap items-center justify-center gap-3" gap={0.05}>
        {TOOLS.map((t) => (
          <Item key={t}>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-5 py-2.5 text-sm text-cream/70 transition hover:border-brass/30 hover:text-cream">
              <span className="h-1.5 w-1.5 rounded-full bg-brass/60" />{t}
            </span>
          </Item>
        ))}
      </Stagger>
    </section>
  );
}

/* ═══ Pricing preview ═══ */
const PLANS = [
  { name: "Solo", price: "$29", note: "1 chair", features: ["Branded booking page", "Online booking + QR", "Chair-side portal", "Email confirmations"], featured: false },
  { name: "Pro", price: "$39", note: "up to 6 barbers", features: ["Everything in Solo", "Owner reports & goals", "Reviews & gallery", "No-show tracking"], featured: true },
  { name: "Enterprise", price: "$129", note: "unlimited barbers", features: ["Everything in Pro", "Multi-location dashboard", "Advanced analytics", "Dedicated support"], featured: false },
];

export function Pricing() {
  return (
    <section id="pricing" className="relative z-10 mx-auto max-w-6xl px-5 py-24">
      <Heading eyebrow="Simple Pricing" title={<>One flat price. <span className="gold-text">No per-booking fees.</span></>} sub="Up to half the price of Squire and Booksy. Cancel anytime." />
      <Stagger className="mt-14 grid items-stretch gap-5 md:grid-cols-3" gap={0.1}>
        {PLANS.map((p) => (
          <Item key={p.name} className={p.featured ? "md:-mt-3" : ""}>
            <div className={`relative flex h-full flex-col rounded-3xl p-7 ${p.featured ? "lux-featured" : "border border-white/10 bg-white/[0.02]"}`}>
              {p.featured && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-[#f4d585] to-[#b98a3c] px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-[#17130a]">Most Popular</span>
              )}
              <div className="text-sm font-semibold text-brass">{p.name}</div>
              <div className="mt-3 flex items-baseline gap-1.5">
                <span className="font-display text-5xl font-bold text-cream">{p.price}</span>
                <span className="text-sm text-cream/45">/mo</span>
              </div>
              <div className="mt-1 text-xs text-cream/50">{p.note} · per shop</div>
              <ul className="mt-6 flex-1 space-y-3">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm text-cream/70">
                    <Icon.check className="mt-0.5 h-4 w-4 shrink-0 text-brass" />{f}
                  </li>
                ))}
              </ul>
              <Link href="/beta" className={`mt-7 w-full text-center ${p.featured ? "btn-gold" : "btn-outline-gold"}`}>
                Start free trial
              </Link>
            </div>
          </Item>
        ))}
      </Stagger>
      <Reveal className="mt-6 text-center text-sm text-cream/45">
        <Link href="/pricing" className="text-brass hover:underline">Compare all plans →</Link>
      </Reveal>
    </section>
  );
}

/* ═══ Final CTA ═══ */
export function FinalCTA() {
  return (
    <section className="relative z-10 mx-auto max-w-6xl px-5 py-20">
      <Reveal>
        <div className="relative overflow-hidden rounded-[2.5rem] border border-brass/20 px-6 py-20 text-center sm:px-16">
          <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_50%_0%,rgba(216,178,92,0.22),transparent_60%)]" />
          <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-[#100e0a] to-[#0a0908]" />
          <h2 className="mx-auto max-w-2xl font-display text-4xl font-medium leading-tight tracking-tight text-cream sm:text-5xl">
            Ready to <span className="gold-text">grow your barbershop?</span>
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-lg text-cream/60">
            Join the shops booking more and running smoother with The Chair. Start free — no credit card required.
          </p>
          <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
            <Link href="/beta" className="btn-gold text-base">Get Started Free <Icon.arrow className="h-4 w-4" /></Link>
            <Link href="/t/demo-store" className="btn-outline-gold text-base">See it live</Link>
          </div>
          <div className="mt-6 text-xs text-cream/40">No credit card · Set up in minutes · Cancel anytime</div>
        </div>
      </Reveal>
    </section>
  );
}
