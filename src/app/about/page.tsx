import type { Metadata } from "next";
import { LuxPage } from "@/components/home/LuxPage";
import { LuxHeading, LuxCTA } from "@/components/home/LuxBits";
import { Reveal, Stagger, Item, Counter } from "@/components/home/motion";
import { Icon, type IconName } from "@/components/home/icons";
import { DashboardMock, PhoneMock } from "@/components/home/mockups";

export const metadata: Metadata = {
  title: "About — built by people who understand barbershops",
  description:
    "The Chair was created to replace outdated barbershop software with a modern platform designed specifically for barbers and shop owners. Meet the mission, values, and story behind The Chair.",
  alternates: { canonical: "/about" },
  openGraph: { title: "The Chair — About", description: "Modern software built specifically for barbers and shop owners.", url: "/about", type: "website" },
};

const VALUES: { icon: IconName; title: string; copy: string }[] = [
  { icon: "loyalty", title: "Customer First", copy: "Every decision starts with the barber and their clients. If it doesn't make the shop better, it doesn't ship." },
  { icon: "spark", title: "Innovation", copy: "Modern tools that keep getting better — we ship improvements constantly, not once a year." },
  { icon: "shield", title: "Reliability", copy: "Your shop runs on us. We take uptime, security, and your data seriously." },
  { icon: "check", title: "Simplicity", copy: "Powerful under the hood, but simple enough to master on day one — no manual required." },
  { icon: "customers", title: "Community", copy: "Built with barbers, for barbers. Your feedback shapes the roadmap." },
  { icon: "growth", title: "Growth", copy: "Software that scales with you — from your first chair to your fiftieth location." },
];

const REASONS = ["Purpose-built for barbers", "Modern, beautiful interface", "Fast check-in workflow", "Powerful built-in analytics", "Role-based permissions", "Scales from solo barber to franchise"];

const STATS = [
  { el: <><Counter to={10000} suffix="+" /></>, label: "Appointments Managed" },
  { el: <><Counter to={1500} suffix="+" /></>, label: "Active Barbers" },
  { el: <><Counter to={99.9} decimals={1} suffix="%" /></>, label: "Platform Uptime" },
  { el: <>Millions</>, label: "Revenue Processed" },
];

export default function AboutPage() {
  return (
    <LuxPage>
      {/* Hero */}
      <section className="mx-auto max-w-4xl px-5 pt-36 text-center sm:pt-44">
        <Reveal><div className="text-xs font-semibold uppercase tracking-[0.24em] text-brass/80">Our story</div></Reveal>
        <Reveal delay={0.05}>
          <h1 className="mt-4 font-display text-[2.6rem] font-medium leading-[1.05] tracking-tight text-cream sm:text-6xl">
            Built by people who <span className="gold-text">understand barbershops.</span>
          </h1>
        </Reveal>
        <Reveal delay={0.12}>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-cream/60">
            The Chair was created to replace clunky, outdated software with a modern platform designed
            specifically for barbers and shop owners — beautiful, fast, and built around how you actually work.
          </p>
        </Reveal>
      </section>

      {/* Mission */}
      <section className="mx-auto max-w-6xl px-5 py-24">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <Reveal>
            <div className="text-xs font-semibold uppercase tracking-[0.24em] text-brass/80">Our mission</div>
            <h2 className="mt-3 font-display text-4xl font-medium tracking-tight text-cream">Barbershops deserve <span className="gold-text">better tools.</span></h2>
            <div className="mt-5 space-y-4 text-cream/60">
              <p>Most barbershop software feels like it was built for a spreadsheet, not a chair — confusing menus, per-booking fees, and features no barber asked for.</p>
              <p>We started The Chair to fix that: to bring appointments, clients, staff, payments, and analytics into one place that feels as premium as the service you give.</p>
              <p>Our vision is simple — give every shop, from a single chair to a growing franchise, enterprise-grade tools that are a genuine pleasure to use.</p>
            </div>
          </Reveal>
          <Reveal delay={0.12} className="relative mx-auto w-full max-w-[520px]">
            <div className="pointer-events-none absolute -inset-8 -z-10 rounded-[3rem] bg-[radial-gradient(circle_at_50%_40%,rgba(216,178,92,0.16),transparent_65%)] blur-2xl" />
            <div className="lux-float-slow"><DashboardMock /></div>
            <div className="lux-float absolute -bottom-8 -left-3 hidden sm:block"><PhoneMock /></div>
          </Reveal>
        </div>
      </section>

      {/* Core values */}
      <section className="mx-auto max-w-7xl px-5 py-16">
        <LuxHeading eyebrow="What we believe" title={<>The values behind <span className="gold-text">every decision</span></>} />
        <Stagger className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3" gap={0.06}>
          {VALUES.map((v) => {
            const I = Icon[v.icon];
            return (
              <Item key={v.title}>
                <div className="lux-card group h-full p-6">
                  <span className="grid h-12 w-12 place-items-center rounded-2xl border border-brass/25 bg-gradient-to-br from-brass/15 to-transparent text-brass transition group-hover:scale-105"><I className="h-6 w-6" /></span>
                  <h3 className="mt-5 text-lg font-semibold text-cream">{v.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-cream/55">{v.copy}</p>
                </div>
              </Item>
            );
          })}
        </Stagger>
      </section>

      {/* Why choose */}
      <section className="mx-auto max-w-5xl px-5 py-16">
        <LuxHeading eyebrow="Why The Chair" title={<>Why shops choose us over <span className="gold-text">traditional software</span></>} />
        <div className="mt-12 grid gap-5 md:grid-cols-2">
          <Reveal>
            <div className="h-full rounded-3xl border border-white/10 bg-white/[0.02] p-7">
              <div className="text-sm font-semibold text-cream/50">The old way</div>
              <ul className="mt-5 space-y-3">
                {REASONS.map((r) => (
                  <li key={r} className="flex items-center gap-2.5 text-sm text-cream/40"><span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-white/5 text-cream/30">—</span>{r}</li>
                ))}
              </ul>
            </div>
          </Reveal>
          <Reveal delay={0.1}>
            <div className="lux-featured h-full rounded-3xl p-7">
              <div className="text-sm font-semibold text-brass">With The Chair</div>
              <ul className="mt-5 space-y-3">
                {REASONS.map((r) => (
                  <li key={r} className="flex items-center gap-2.5 text-sm text-cream/85"><Icon.check className="h-5 w-5 shrink-0 text-brass" />{r}</li>
                ))}
              </ul>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Stats */}
      <section className="mx-auto max-w-6xl px-5 py-16">
        <div className="glass grid grid-cols-2 gap-6 rounded-3xl px-6 py-10 sm:px-10 md:grid-cols-4">
          {STATS.map((s, i) => (
            <Reveal key={i} delay={i * 0.08} className="text-center">
              <div className="gold-text font-display text-4xl font-bold sm:text-5xl">{s.el}</div>
              <div className="mt-2 text-xs text-cream/55 sm:text-sm">{s.label}</div>
            </Reveal>
          ))}
        </div>
      </section>

      <LuxCTA
        title={<>Ready to experience the <span className="gold-text">future of barbershop management?</span></>}
        sub="Join the shops running smoother and growing faster with The Chair. Start free — no credit card required."
        actions={[{ label: "Start Free", href: "/signup", primary: true }, { label: "Contact Sales", href: "/contact" }]}
      />
    </LuxPage>
  );
}
