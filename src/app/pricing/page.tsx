import type { Metadata } from "next";
import Link from "next/link";
import { LuxNav } from "@/components/home/LuxNav";
import { Footer } from "@/components/home/Footer";
import { Reveal, Stagger, Item, Counter } from "@/components/home/motion";
import { Icon, type IconName } from "@/components/home/icons";
import { Faq, type Qa } from "@/components/pricing/Faq";

export const metadata: Metadata = {
  title: "Pricing — flat monthly plans for barbershops",
  description:
    "Simple pricing that grows with your barbershop. Every plan includes unlimited appointments, online booking, and customer management. Free Starter, $29 Professional, $79 Shop, and custom Enterprise. No per-booking fees.",
  alternates: { canonical: "/pricing" },
  openGraph: {
    title: "The Chair — Pricing",
    description: "Flat monthly plans for barbershops. Free to start, no per-booking fees. Unlock more as you grow.",
    url: "/pricing",
    type: "website",
  },
};

const EMBERS = [
  { l: "10%", s: 3, d: 15, delay: 0 }, { l: "24%", s: 2, d: 19, delay: 4 }, { l: "38%", s: 3, d: 13, delay: 7 },
  { l: "52%", s: 2, d: 21, delay: 1 }, { l: "66%", s: 4, d: 14, delay: 5 }, { l: "80%", s: 2, d: 18, delay: 8 },
  { l: "90%", s: 3, d: 16, delay: 3 }, { l: "46%", s: 2, d: 22, delay: 6 },
];

type Cell = boolean | string;
type Plan = {
  key: string; name: string; icon: IconName; priceNum?: number; price?: string; per?: string;
  desc: string; plus?: string; features: string[]; cta: { label: string; href: string }; featured?: boolean;
};

const PLANS: Plan[] = [
  {
    key: "starter", name: "Starter", icon: "staff", price: "FREE", desc: "Perfect for independent barbers just getting started.",
    cta: { label: "Start Free", href: "/beta" },
    features: ["Unlimited appointments", "Online booking page", "Booking calendar", "One barber account", "Client profiles", "Appointment history", "Walk-in management", "Check-In / Check-Out", "Email confirmations", "Basic reporting", "Mobile responsive", "Secure cloud storage"],
  },
  {
    key: "pro", name: "Professional", icon: "crown", priceNum: 29, per: "/month", featured: true,
    desc: "Designed for barbers ready to grow their clientele.", plus: "Everything in Starter plus:",
    cta: { label: "Start 14-Day Free Trial", href: "/beta" },
    features: ["Up to 5 barber accounts", "Team scheduling", "SMS appointment reminders", "Loyalty program", "Memberships", "Gift cards", "Advanced analytics", "Revenue dashboard", "Review request automation", "POS integrations", "Custom branding", "Export reports", "Priority support"],
  },
  {
    key: "shop", name: "Shop", icon: "store", priceNum: 79, per: "/month",
    desc: "Built for barbershop owners running an entire business.", plus: "Everything in Professional plus:",
    cta: { label: "Start Free Trial", href: "/beta" },
    features: ["Unlimited staff accounts", "Inventory management", "Retail product management", "Low inventory alerts", "Commission tracking", "Employee permissions", "Payroll exports", "Advanced scheduling", "Shop-wide analytics", "Multi-location support (up to 5)", "Business performance dashboard"],
  },
  {
    key: "ent", name: "Enterprise", icon: "building", price: "Custom", per: "Pricing",
    desc: "Designed for franchise groups and enterprise organizations.", plus: "Everything in Shop plus:",
    cta: { label: "Contact Sales", href: "/contact" },
    features: ["Unlimited locations", "Franchise dashboard", "Corporate analytics", "Regional manager permissions", "White labeling", "API access", "Custom integrations", "Dedicated onboarding", "Single Sign-On (SSO)", "Advanced security", "SLA support", "Dedicated success manager"],
  },
];

const COMPARE: { icon: IconName; label: string; cells: [Cell, Cell, Cell, Cell] }[] = [
  { icon: "booking", label: "Online Booking", cells: [true, true, true, true] },
  { icon: "checkin", label: "Check-In / Check-Out", cells: [true, true, true, true] },
  { icon: "customers", label: "Client Management", cells: [true, true, true, true] },
  { icon: "staff", label: "Staff Accounts", cells: ["1 Barber", "Up to 5", "Unlimited", "Unlimited"] },
  { icon: "inventory", label: "Inventory Management", cells: [false, false, true, true] },
  { icon: "loyalty", label: "Loyalty Program", cells: [false, true, true, true] },
  { icon: "analytics", label: "Analytics & Reports", cells: ["Basic", "Advanced", "Advanced", "Enterprise"] },
  { icon: "building", label: "Multi-Location Support", cells: [false, false, "Up to 5", "Unlimited"] },
  { icon: "headset", label: "Priority Support", cells: [false, true, true, true] },
  { icon: "code", label: "API Access", cells: [false, false, false, true] },
];

const COLS = [
  { name: "Starter", sub: "Free" },
  { name: "Professional", sub: "$29/month" },
  { name: "Shop", sub: "$79/month" },
  { name: "Enterprise", sub: "Custom" },
];

const WHY: { icon: IconName; title: string; desc: string }[] = [
  { icon: "growth", title: "Grow Your Business", desc: "Unlock advanced analytics, customer retention tools, loyalty programs, and automation to increase revenue and rebook clients on autopilot." },
  { icon: "staff", title: "Run Your Shop Efficiently", desc: "Streamline daily operations with employee scheduling, fast check-in workflows, payroll exports, and commission tracking." },
  { icon: "building", title: "Scale Without Limits", desc: "Manage multiple locations, empower your team with permissions, and access enterprise tools built for long-term growth." },
];

const FAQ_COLUMNS: Qa[][] = [
  [
    { q: "Can I change plans later?", a: "Yes — upgrade or downgrade anytime from your dashboard. Changes take effect immediately and we prorate the difference." },
    { q: "Is there a free trial?", a: "Paid plans include a 14-day free trial, and the Starter plan is free forever. No credit card required to start." },
    { q: "Are there setup fees?", a: "Never. There are no setup fees, onboarding fees, or hidden charges — just one flat monthly price per shop." },
  ],
  [
    { q: "Can I cancel anytime?", a: "Absolutely. Cancel in one click; you keep access through the end of your billing period and can export your data." },
    { q: "Do you charge booking fees?", a: "No. Unlike Squire and Booksy, we never charge per-booking fees. Your online bookings are always free." },
    { q: "Is support included?", a: "Yes. Every plan includes support, and Professional and above get priority support with faster response times." },
  ],
  [
    { q: "Can I import customers?", a: "Yes — import your existing client list from a spreadsheet in minutes, and we'll help during onboarding." },
    { q: "Can I accept walk-ins?", a: "Of course. Walk-in management and self check-in are built in, so you can log walk-ins and manage the queue with ease." },
    { q: "Can multiple barbers share one shop?", a: "Yes. Add barbers to your shop (up to 5 on Professional, unlimited on Shop) with their own schedules and logins." },
    { q: "Is my data secure?", a: "Your data is encrypted in transit, backed up, and isolated per shop with role-based access controls. You own your data." },
  ],
];

const FAQ_JSONLD = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQ_COLUMNS.flat().map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
};

export default function PricingPage() {
  return (
    <div className="lux relative min-h-screen">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(FAQ_JSONLD) }} />
      <div className="lux-atmosphere" aria-hidden />
      <div className="lux-grain" aria-hidden />
      <div className="lux-embers absolute inset-x-0 top-0 h-[110vh]" aria-hidden>
        {EMBERS.map((e, i) => (
          <span key={i} className="lux-ember" style={{ left: e.l, width: e.s, height: e.s, animationDuration: `${e.d}s`, animationDelay: `${e.delay}s` }} />
        ))}
      </div>

      <LuxNav />

      <main className="relative">
        {/* Hero */}
        <section className="mx-auto max-w-4xl px-5 pt-36 text-center sm:pt-44">
          <Reveal>
            <div className="text-xs font-semibold uppercase tracking-[0.24em] text-brass/80">Pricing that grows with you</div>
          </Reveal>
          <Reveal delay={0.05}>
            <h1 className="mt-4 font-display text-[2.6rem] font-medium leading-[1.05] tracking-tight text-cream sm:text-6xl">
              Simple pricing that
              <span className="mt-1 block gold-script text-[3rem] font-bold leading-[1.15] sm:text-[4.4rem]">grows with your barbershop.</span>
            </h1>
          </Reveal>
          <Reveal delay={0.12}>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-cream/60">
              Every plan includes unlimited appointments, online booking, and customer management —
              with more powerful features unlocking as your business grows.
            </p>
          </Reveal>
        </section>

        {/* Pricing cards */}
        <section className="mx-auto max-w-7xl px-5 pb-10 pt-16">
          <Stagger className="grid items-stretch gap-5 md:grid-cols-2 lg:grid-cols-4" gap={0.08}>
            {PLANS.map((p) => <Item key={p.key} className={p.featured ? "lg:-my-4" : ""}><PlanCard p={p} /></Item>)}
          </Stagger>
          <Reveal className="mt-6 text-center text-xs text-cream/40">
            All prices per shop, per month. No per-booking fees. Cancel anytime.
          </Reveal>
        </section>

        {/* Comparison table */}
        <section className="mx-auto max-w-7xl px-5 py-20">
          <Reveal>
            <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.02]">
              <div className="p-scroll overflow-x-auto">
                <table className="w-full min-w-[720px] text-left">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="px-5 py-5 align-bottom font-display text-lg text-cream">Compare Plans</th>
                      {COLS.map((c, i) => (
                        <th key={c.name} className={`px-4 py-5 text-center ${i === 1 ? "bg-brass/[0.05]" : ""}`}>
                          <div className="text-sm font-semibold text-cream">{c.name}</div>
                          <div className="text-xs text-cream/45">{c.sub}</div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {COMPARE.map((row) => {
                      const RI = Icon[row.icon];
                      return (
                        <tr key={row.label} className="border-b border-white/5 last:border-0">
                          <th scope="row" className="px-5 py-3.5 text-left font-normal">
                            <span className="flex items-center gap-2.5 text-sm text-cream/80"><span className="text-brass"><RI className="h-4 w-4" /></span>{row.label}</span>
                          </th>
                          {row.cells.map((cell, i) => (
                            <td key={i} className={`px-4 py-3.5 text-center ${i === 1 ? "bg-brass/[0.04]" : ""}`}><CellView v={cell} /></td>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </Reveal>
        </section>

        {/* Why upgrade */}
        <section className="mx-auto max-w-6xl px-5 py-16">
          <Reveal className="text-center">
            <h2 className="font-display text-4xl font-medium tracking-tight text-cream">Why <span className="gold-text">upgrade?</span></h2>
          </Reveal>
          <Stagger className="mt-12 grid gap-5 md:grid-cols-3" gap={0.1}>
            {WHY.map((w) => {
              const WI = Icon[w.icon];
              return (
                <Item key={w.title}>
                  <div className="lux-card h-full p-7">
                    <span className="grid h-12 w-12 place-items-center rounded-2xl border border-brass/25 bg-gradient-to-br from-brass/15 to-transparent text-brass"><WI className="h-6 w-6" /></span>
                    <h3 className="mt-5 text-lg font-semibold text-cream">{w.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-cream/55">{w.desc}</p>
                  </div>
                </Item>
              );
            })}
          </Stagger>
        </section>

        {/* FAQ */}
        <section className="mx-auto max-w-6xl px-5 py-16">
          <Reveal className="mb-10 text-center">
            <h2 className="font-display text-4xl font-medium tracking-tight text-cream">Frequently Asked <span className="gold-text">Questions</span></h2>
          </Reveal>
          <Reveal delay={0.05}><Faq columns={FAQ_COLUMNS} /></Reveal>
        </section>

        {/* Final CTA */}
        <section className="mx-auto max-w-6xl px-5 py-20">
          <Reveal>
            <div className="relative overflow-hidden rounded-[2.5rem] border border-brass/20 px-6 py-20 text-center sm:px-16">
              <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_50%_0%,rgba(216,178,92,0.22),transparent_60%)]" />
              <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-[#100e0a] to-[#0a0908]" />
              <div className="lux-embers pointer-events-none absolute inset-0" aria-hidden>
                {EMBERS.slice(0, 6).map((e, i) => (
                  <span key={i} className="lux-ember" style={{ left: e.l, width: e.s, height: e.s, animationDuration: `${e.d}s`, animationDelay: `${e.delay}s` }} />
                ))}
              </div>
              <h2 className="mx-auto max-w-2xl font-display text-4xl font-medium leading-tight tracking-tight text-cream sm:text-5xl">
                Ready to <span className="gold-text">grow your barbershop?</span>
              </h2>
              <p className="mx-auto mt-5 max-w-xl text-lg text-cream/60">
                Join thousands of barbers who trust The Chair to run their business. Start free today — no credit card required.
              </p>
              <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
                <Link href="/beta" className="btn-gold text-base">Start Free <Icon.arrow className="h-4 w-4" /></Link>
                <Link href="/contact" className="btn-outline-gold text-base">Contact Sales</Link>
              </div>
              <div className="mt-7 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-cream/45">
                <span className="flex items-center gap-1.5"><Icon.calendar className="h-3.5 w-3.5 text-brass" /> 14-Day Free Trial</span>
                <span className="flex items-center gap-1.5"><Icon.check className="h-3.5 w-3.5 text-brass" /> No Credit Card Required</span>
                <span className="flex items-center gap-1.5"><Icon.shield className="h-3.5 w-3.5 text-brass" /> Cancel Anytime</span>
              </div>
            </div>
          </Reveal>
        </section>
      </main>

      <Footer />
    </div>
  );
}

function PlanCard({ p }: { p: Plan }) {
  const I = Icon[p.icon];
  return (
    <div className={`relative flex h-full flex-col rounded-3xl p-6 sm:p-7 ${p.featured ? "lux-featured" : "border border-white/10 bg-white/[0.02]"}`}>
      {p.featured && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-gradient-to-r from-[#f4d585] to-[#b98a3c] px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-[#17130a]">Most Popular</span>
      )}
      <div className="flex justify-center">
        <span className="grid h-16 w-16 place-items-center rounded-full border border-brass/30 bg-brass/[0.06] text-brass"><I className="h-7 w-7" /></span>
      </div>
      <h3 className="mt-4 text-center font-display text-2xl text-cream">{p.name}</h3>
      <div className="mt-2 text-center">
        {p.priceNum != null ? (
          <div className="flex items-end justify-center gap-1">
            <span className="font-display text-5xl font-bold text-cream"><span className="align-top text-2xl">$</span><Counter to={p.priceNum} /></span>
            <span className="pb-1.5 text-sm text-cream/50">{p.per}</span>
          </div>
        ) : (
          <div>
            <span className="gold-text font-display text-4xl font-bold">{p.price}</span>
            {p.per && <span className="ml-1 text-sm text-cream/50">{p.per}</span>}
          </div>
        )}
      </div>
      <p className="mx-auto mt-3 max-w-[15rem] text-center text-sm text-cream/55">{p.desc}</p>

      <div className="p-hairline my-5" />

      {p.plus && <div className="mb-3 text-sm font-semibold text-brass">{p.plus}</div>}
      <ul className="flex-1 space-y-2.5">
        {p.features.map((f) => (
          <li key={f} className="flex items-start gap-2.5 text-sm text-cream/75">
            <Icon.check className="mt-0.5 h-4 w-4 shrink-0 text-brass" />{f}
          </li>
        ))}
      </ul>

      <Link href={p.cta.href} className={`mt-6 w-full text-center ${p.featured ? "btn-gold" : "btn-outline-gold"}`}>{p.cta.label}</Link>
    </div>
  );
}

function CellView({ v }: { v: Cell }) {
  if (v === true) return <Icon.check className="mx-auto h-5 w-5 text-brass" />;
  if (v === false) return <span className="text-cream/25">—</span>;
  return <span className="text-sm text-cream/70">{v}</span>;
}
