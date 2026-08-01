import type { Metadata } from "next";
import Link from "next/link";
import { LuxNav } from "@/components/home/LuxNav";
import { Footer } from "@/components/home/Footer";
import { Reveal, Stagger, Item, Counter } from "@/components/home/motion";
import { Icon, type IconName } from "@/components/home/icons";
import { Faq, type Qa } from "@/components/pricing/Faq";
import { jsonLdSafe } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Pricing — flat monthly plans for barbershops",
  description:
    "Simple pricing that grows with your shop. Solo is $29/mo (1 barber), Team is $49/mo (3 barbers), Barbershop is $129/mo (8 barbers), and Enterprise is custom. Unlimited appointments, online booking, and no per-booking fees.",
  alternates: { canonical: "/pricing" },
  openGraph: {
    title: "The Chair — Pricing",
    description: "Flat monthly plans for barbershops. 14-day free trial, no per-booking fees. Unlock more as you grow.",
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
type Feature = { t: string; soon?: boolean };
type Plan = {
  key: string; name: string; icon: IconName; priceNum?: number; price?: string; per?: string;
  desc: string; includes?: string; extra?: string; plus?: string; features: Feature[];
  cta: { label: string; href: string }; featured?: boolean;
};

// Real features are listed first; anything still on the roadmap is tagged `soon`
// so the page stays honest (see the "Soon" note under the cards).
const PLANS: Plan[] = [
  {
    key: "solo", name: "Solo", icon: "staff", priceNum: 29, per: "/month",
    desc: "Perfect for independent barbers.",
    cta: { label: "Start Trial", href: "/signup?plan=solo" },
    features: [{ t: "1 barber" }, { t: "Unlimited appointments" }, { t: "Online booking" }, { t: "Client CRM" }, { t: "Booking calendar" }, { t: "Works on any device" }],
  },
  {
    key: "team", name: "Team", icon: "crown", priceNum: 49, per: "/month",
    desc: "Built for growing teams.",
    includes: "Includes 3 Barbers", extra: "+$10/month per additional barber",
    plus: "Everything in Solo, plus:",
    cta: { label: "Start Trial", href: "/signup?plan=team" },
    features: [{ t: "Team scheduling" }, { t: "Advanced reports" }, { t: "Custom branding" }, { t: "Loyalty program" }, { t: "POS integrations", soon: true }],
  },
  {
    key: "barbershop", name: "Barbershop", icon: "store", priceNum: 129, per: "/month", featured: true,
    desc: "Everything you need to run a modern barbershop.",
    includes: "Includes 8 Barbers", extra: "+$8/month per additional barber",
    plus: "Everything in Team, plus:",
    cta: { label: "Start 14-Day Trial", href: "/signup?plan=barbershop" },
    features: [{ t: "Advanced scheduling" }, { t: "Staff permissions" }, { t: "Analytics dashboard" }, { t: "SMS reminders" }, { t: "Inventory management", soon: true }, { t: "Payroll exports", soon: true }, { t: "Commission tracking", soon: true }, { t: "Memberships", soon: true }, { t: "Multi-location (up to 3)", soon: true }, { t: "Business intelligence", soon: true }],
  },
  {
    key: "ent", name: "Enterprise", icon: "building", price: "Custom",
    desc: "For franchises and multi-location businesses.",
    plus: "Everything in Barbershop, plus:",
    cta: { label: "Contact Sales", href: "/contact" },
    features: [{ t: "Dedicated onboarding" }, { t: "SLA support" }, { t: "Unlimited locations", soon: true }, { t: "API access", soon: true }, { t: "Single Sign-On (SSO)", soon: true }, { t: "White labeling", soon: true }, { t: "Franchise dashboard", soon: true }, { t: "Custom integrations", soon: true }],
  },
];

const SOON = "soon"; // rendered as a "Soon" pill by CellView
const COMPARE: { icon: IconName; label: string; cells: [Cell, Cell, Cell, Cell] }[] = [
  { icon: "booking", label: "Online Booking", cells: [true, true, true, true] },
  { icon: "checkin", label: "Check-In / Check-Out", cells: [true, true, true, true] },
  { icon: "customers", label: "Client CRM", cells: [true, true, true, true] },
  { icon: "staff", label: "Barber Accounts", cells: ["1", "3 incl.", "8 incl.", "Unlimited"] },
  { icon: "analytics", label: "Analytics & Reports", cells: ["Basic", "Advanced", "Dashboard", "Advanced"] },
  { icon: "loyalty", label: "Loyalty program", cells: [false, true, true, true] },
  { icon: "messages", label: "SMS & email reminders", cells: [false, false, true, true] },
  { icon: "customers", label: "Memberships", cells: [false, false, SOON, SOON] },
  { icon: "inventory", label: "Inventory Management", cells: [false, false, SOON, SOON] },
  { icon: "building", label: "Multi-Location", cells: [false, false, SOON, SOON] },
  { icon: "code", label: "API Access & SSO", cells: [false, false, false, SOON] },
  { icon: "headset", label: "Dedicated Support", cells: [false, false, true, "SLA"] },
];

const COLS = [
  { name: "Solo", sub: "$29/month" },
  { name: "Team", sub: "$49/month" },
  { name: "Barbershop", sub: "$129/month" },
  { name: "Enterprise", sub: "Custom" },
];
const FEATURED_COL = 2; // Barbershop

const WHY: { icon: IconName; title: string; desc: string }[] = [
  { icon: "growth", title: "Grow Your Business", desc: "Unlock advanced analytics, customer retention tools, loyalty programs, and automation to increase revenue and rebook clients on autopilot." },
  { icon: "staff", title: "Run Your Shop Efficiently", desc: "Streamline daily operations with team scheduling, fast check-in workflows, payroll exports, and commission tracking." },
  { icon: "building", title: "Scale Without Limits", desc: "Manage multiple locations, empower your team with permissions, and access enterprise tools built for long-term growth." },
];

// Two balanced columns (5 + 5) so the FAQ stays symmetric and centered.
const FAQ_COLUMNS: Qa[][] = [
  [
    { q: "Can I change plans later?", a: "Yes — upgrade or downgrade anytime from your dashboard. Changes take effect immediately and we prorate the difference." },
    { q: "Is there a free trial?", a: "Every plan includes a 14-day free trial. No credit card required to start." },
    { q: "How does per-barber pricing work?", a: "Team includes 3 barbers (+$10/mo each after) and Barbershop includes 8 barbers (+$8/mo each after). Add or remove seats anytime." },
    { q: "Are there setup fees?", a: "Never. There are no setup fees, onboarding fees, or hidden charges — just one flat monthly price per shop." },
    { q: "Do you charge booking fees?", a: "No. Unlike Squire and Booksy, we never charge per-booking fees. Your online bookings are always free." },
  ],
  [
    { q: "Can I cancel anytime?", a: "Absolutely. Cancel in one click; you keep access through the end of your billing period and can export your data." },
    { q: "Is support included?", a: "Yes. Every plan includes support; Barbershop adds dedicated support and Enterprise adds an SLA with a dedicated success manager." },
    { q: "Can I import customers?", a: "Yes — import your existing client list from a spreadsheet in minutes, and we'll help during onboarding." },
    { q: "Can I accept walk-ins?", a: "Of course. Walk-in management and self check-in are built in, so you can log walk-ins and manage the queue with ease." },
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
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdSafe(FAQ_JSONLD) }} />
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
              <span className="mt-1 block gold-script text-[3rem] font-bold leading-[1.3] pb-[0.22em] sm:text-[4.4rem]">grows with your shop.</span>
            </h1>
          </Reveal>
          <Reveal delay={0.12}>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-cream/60">
              Start with a free trial and add barbers as you grow. Every plan includes unlimited
              appointments, online booking, and your client CRM — with no per-booking fees, ever.
            </p>
          </Reveal>
        </section>

        {/* Pricing cards */}
        <section className="mx-auto max-w-7xl px-5 pb-10 pt-24">
          <Stagger className="grid items-stretch gap-5 pt-6 md:grid-cols-2 lg:grid-cols-4 lg:gap-6" gap={0.08}>
            {PLANS.map((p) => (
              <Item key={p.key} className={p.featured ? "lg:z-20 lg:-my-6 lg:scale-[1.05]" : ""}>
                <PlanCard p={p} />
              </Item>
            ))}
          </Stagger>
          <Reveal className="mt-8 text-center text-xs text-cream/40">
            <p>
              <span className="mr-1 rounded-full border border-brass/25 bg-brass/[0.06] px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-brass/70">Soon</span>
              marks features on our roadmap — everything else is live today.
            </p>
            <p className="mt-2">All prices per shop, per month. No per-booking fees. Cancel anytime.</p>
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
                        <th key={c.name} className={`px-4 py-5 text-center ${i === FEATURED_COL ? "bg-brass/[0.06]" : ""}`}>
                          <div className={`text-sm font-semibold ${i === FEATURED_COL ? "text-brass" : "text-cream"}`}>{c.name}</div>
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
                            <td key={i} className={`px-4 py-3.5 text-center ${i === FEATURED_COL ? "bg-brass/[0.05]" : ""}`}><CellView v={cell} /></td>
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
          <Reveal delay={0.05} className="mx-auto max-w-4xl"><Faq columns={FAQ_COLUMNS} gridClassName="grid gap-4 md:grid-cols-2" /></Reveal>
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
                <Link href="/signup" className="btn-gold text-base">Start Free <Icon.arrow className="h-4 w-4" /></Link>
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
  const solidCta = p.priceNum != null; // Team + Barbershop use a filled gold button; Solo + Enterprise are outlined.
  return (
    <div
      className={`relative flex h-full flex-col rounded-[24px] ${p.featured ? "lux-featured p-7 shadow-[0_0_70px_-18px_rgba(216,178,92,0.55)] sm:p-8" : "border border-white/10 bg-white/[0.02] p-6 shadow-[0_20px_60px_-40px_rgba(0,0,0,0.9)] sm:p-7"}`}
    >
      {p.featured && (
        <>
          {/* Spotlight behind the featured card's header */}
          <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden rounded-[24px]">
            <div className="absolute left-1/2 top-0 h-40 w-64 -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(216,178,92,0.28),transparent_70%)] blur-xl" />
          </div>
          <span className="absolute -top-4 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-gradient-to-r from-[#f6dd93] via-[#e8c46c] to-[#b98a3c] px-4 py-1.5 text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#17130a] shadow-[0_8px_24px_-6px_rgba(216,178,92,0.6)]">
            ⭐ Most Popular
          </span>
        </>
      )}

      <div className="flex justify-center">
        <span className={`grid place-items-center rounded-full border border-brass/30 bg-brass/[0.06] text-brass ${p.featured ? "h-[4.5rem] w-[4.5rem]" : "h-16 w-16"}`}><I className={p.featured ? "h-8 w-8" : "h-7 w-7"} /></span>
      </div>

      <h3 className={`mt-4 text-center font-display text-cream ${p.featured ? "text-3xl" : "text-2xl"}`}>{p.name}</h3>

      <div className="mt-2 text-center">
        {p.priceNum != null ? (
          <div className="flex items-end justify-center gap-1">
            <span className={`font-display font-bold text-cream ${p.featured ? "text-6xl" : "text-5xl"}`}><span className="align-top text-2xl">$</span><Counter to={p.priceNum} /></span>
            <span className="pb-1.5 text-sm text-cream/50">{p.per}</span>
          </div>
        ) : (
          <span className="gold-text font-display text-4xl font-bold">{p.price}</span>
        )}
      </div>

      <p className="mx-auto mt-3 max-w-[15rem] text-center text-sm text-cream/55">{p.desc}</p>

      {p.includes && (
        <div className="mt-4 text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-brass/30 bg-brass/[0.08] px-3 py-1 text-xs font-semibold text-brass">
            <Icon.staff className="h-3.5 w-3.5" /> {p.includes}
          </span>
          {p.extra && <div className="mt-1.5 text-[11px] text-cream/45">{p.extra}</div>}
        </div>
      )}

      <div className="p-hairline my-5" />

      {p.plus && <div className="mb-3 text-sm font-semibold text-brass">{p.plus}</div>}
      <ul className="flex-1 space-y-2.5">
        {p.features.map((f) => (
          <li key={f.t} className={`flex items-start gap-2.5 text-sm ${f.soon ? "text-cream/45" : "text-cream/80"}`}>
            <span className={`mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full ${f.soon ? "bg-white/5 text-cream/40" : "bg-brass/15 text-brass"}`}><Icon.check className="h-3 w-3" /></span>
            <span className="flex-1">{f.t}</span>
            {f.soon && <span className="mt-px shrink-0 rounded-full border border-brass/25 bg-brass/[0.06] px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-brass/70">Soon</span>}
          </li>
        ))}
      </ul>

      <Link
        href={p.cta.href}
        className={`mt-6 w-full text-center ${solidCta ? "btn-gold" : "btn-outline-gold"} ${p.featured ? "!py-4 text-base" : ""}`}
      >
        {p.cta.label}
      </Link>
    </div>
  );
}

function CellView({ v }: { v: Cell }) {
  if (v === true) return <Icon.check className="mx-auto h-5 w-5 text-brass" />;
  if (v === false) return <span className="text-cream/25">—</span>;
  if (v === "soon") return <span className="rounded-full border border-brass/25 bg-brass/[0.06] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-brass/70">Soon</span>;
  return <span className="text-sm text-cream/70">{v}</span>;
}
