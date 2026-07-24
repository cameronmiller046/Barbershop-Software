import type { Metadata } from "next";
import Link from "next/link";
import { LuxPage } from "@/components/home/LuxPage";
import { LuxHeading, LuxCTA } from "@/components/home/LuxBits";
import { Reveal, Stagger, Item } from "@/components/home/motion";
import { Icon, type IconName } from "@/components/home/icons";
import { DashboardMock, PhoneMock, TabletMock } from "@/components/home/mockups";

export const metadata: Metadata = {
  title: "How It Works — run your whole barbershop in one place",
  description:
    "See how The Chair brings appointments, client management, scheduling, check-in, payments, and analytics into one beautiful platform — from booking to growing your business.",
  alternates: { canonical: "/how-it-works" },
  openGraph: { title: "The Chair — How It Works", description: "From booking to growth — one beautiful platform for barbershops.", url: "/how-it-works", type: "website" },
};

const STEPS: { icon: IconName; step: string; title: string; items: string[] }[] = [
  { icon: "booking", step: "01", title: "Customers Book", items: ["Online booking", "Walk-ins", "Appointment confirmations", "Calendar sync"] },
  { icon: "calendar", step: "02", title: "Run Your Day", items: ["Calendar management", "Client check-in", "Barber scheduling", "Live appointment tracking"] },
  { icon: "scissors", step: "03", title: "Complete Services", items: ["Start haircut", "Timer tracking", "Add notes", "Checkout", "Payments", "Tips"] },
  { icon: "growth", step: "04", title: "Grow Your Business", items: ["Analytics", "Loyalty", "Memberships", "Reviews", "Reporting", "Customer retention"] },
];

const FEATURES: { icon: IconName; title: string; copy: string; bullets: string[]; mock: "dash" | "phone" | "tablet" }[] = [
  { icon: "booking", title: "Appointment Calendar", copy: "A living day, week, and month view your whole team shares. Drag to reschedule, spot gaps at a glance, and never double-book a chair again.", bullets: ["Day / week / month views", "Color-coded statuses", "Per-barber filtering"], mock: "dash" },
  { icon: "profiles", title: "Client Profiles", copy: "Every client's history, notes, and preferences in one tap — so every barber gives a personal cut, every time.", bullets: ["Visit history & notes", "Preferred service & barber", "Contact details"], mock: "phone" },
  { icon: "checkin", title: "Check-In Workflow", copy: "From arrival to checkout in a few taps. Check clients in, start the timer, and complete the cut — the queue keeps everyone moving.", bullets: ["One-tap check-in", "Live service timer", "Fast checkout"], mock: "tablet" },
  { icon: "dollar", title: "Revenue Dashboard", copy: "Know exactly how the day is going. Track revenue, monthly goals, and trends without touching a spreadsheet.", bullets: ["Daily & weekly revenue", "Sales goals & pace", "Collected-amount tracking"], mock: "dash" },
  { icon: "staff", title: "Staff Scheduling", copy: "Set each barber's hours, manage chairs, and control what everyone can see with role-based permissions.", bullets: ["Working hours per barber", "Chair limits by plan", "Role-based access"], mock: "tablet" },
  { icon: "analytics", title: "Analytics", copy: "Turn your shop's data into decisions — busiest hours, most profitable barbers, retention, and turnaround times.", bullets: ["Busiest days & hours", "Top-performing barbers", "Retention & no-shows"], mock: "dash" },
];

const BENEFITS: { icon: IconName; title: string; copy: string }[] = [
  { icon: "clock", title: "Save Time", copy: "Automate booking, reminders, and check-in so you spend less time on admin and more time cutting." },
  { icon: "growth", title: "Increase Revenue", copy: "Fill more chairs, sell memberships and gift cards, and rebook clients automatically." },
  { icon: "loyalty", title: "Improve Customer Experience", copy: "Effortless booking and a personal touch keep clients loyal and coming back." },
  { icon: "store", title: "Manage Your Entire Shop", copy: "Appointments, clients, staff, payments, and reports — all in one beautiful place." },
  { icon: "staff", title: "Grow Your Team", copy: "Add barbers, set schedules and permissions, and scale from one chair to many." },
];

function Mock({ kind }: { kind: "dash" | "phone" | "tablet" }) {
  if (kind === "phone") return <PhoneMock />;
  if (kind === "tablet") return <TabletMock />;
  return <DashboardMock />;
}

export default function HowItWorksPage() {
  return (
    <LuxPage>
      {/* Hero */}
      <section className="mx-auto grid max-w-7xl items-center gap-12 px-5 pb-16 pt-36 sm:pt-44 lg:grid-cols-[1.05fr_1fr] lg:pb-24">
        <div>
          <Reveal><span className="inline-flex items-center gap-2 rounded-full border border-brass/25 bg-brass/[0.06] px-3.5 py-1.5 text-xs text-brass/90"><span className="h-1.5 w-1.5 rounded-full bg-brass" /> How The Chair works</span></Reveal>
          <Reveal delay={0.05}>
            <h1 className="mt-6 font-display text-[2.6rem] font-medium leading-[1.04] tracking-tight text-cream sm:text-6xl">
              Everything your barbershop needs—<span className="gold-text">working together.</span>
            </h1>
          </Reveal>
          <Reveal delay={0.12}>
            <p className="mt-6 max-w-lg text-lg leading-relaxed text-cream/65">
              The Chair brings appointments, client management, scheduling, payments, analytics, and daily
              operations into one beautiful platform — so your shop runs itself while you focus on the cut.
            </p>
          </Reveal>
          <Reveal delay={0.18}>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/signup" className="btn-gold text-base">Start Free <Icon.arrow className="h-4 w-4" /></Link>
              <Link href="/pricing" className="btn-outline-gold text-base">View Pricing</Link>
            </div>
          </Reveal>
        </div>
        <Reveal delay={0.15} className="relative mx-auto w-full max-w-[540px] lg:max-w-none">
          <div className="pointer-events-none absolute -inset-10 -z-10 rounded-[3rem] bg-[radial-gradient(circle_at_50%_40%,rgba(216,178,92,0.2),transparent_65%)] blur-2xl" />
          <div className="lux-float-slow"><DashboardMock /></div>
          <div className="glass lux-float absolute -right-3 top-16 hidden rounded-2xl px-3.5 py-2.5 sm:block">
            <div className="text-[10px] uppercase tracking-wide text-cream/40">Today</div>
            <div className="mt-0.5 text-lg font-bold text-brass">12 booked</div>
          </div>
        </Reveal>
      </section>

      {/* Timeline */}
      <section className="mx-auto max-w-7xl px-5 py-20">
        <LuxHeading eyebrow="The Workflow" title={<>From booking to growth in <span className="gold-text">four steps</span></>} sub="A single flow that carries a client from their first tap to a five-star review." />
        <div className="mt-16">
          {/* No connector line here: the steps are cards, so a horizontal rule
              would cut across their icons/text. The cards convey the sequence. */}
          <Stagger className="grid gap-6 md:grid-cols-2 lg:grid-cols-4" gap={0.1}>
            {STEPS.map((s) => {
              const I = Icon[s.icon];
              return (
                <Item key={s.step}>
                  <div className="lux-card h-full p-6 text-center">
                    <div className="relative mx-auto grid h-16 w-16 place-items-center rounded-full border border-brass/30 bg-[#0d0c0f] text-brass shadow-[0_0_0_6px_rgba(216,178,92,0.06)]">
                      <I className="h-7 w-7" />
                      <span className="absolute -right-1 -top-1 grid h-6 w-6 place-items-center rounded-full bg-gradient-to-br from-[#f4d585] to-[#b98a3c] text-[10px] font-bold text-[#17130a]">{s.step}</span>
                    </div>
                    <h3 className="mt-5 text-lg font-semibold text-cream">{s.title}</h3>
                    <ul className="mt-4 space-y-2 text-left">
                      {s.items.map((it) => (
                        <li key={it} className="flex items-center gap-2 text-sm text-cream/65"><Icon.check className="h-4 w-4 shrink-0 text-brass" />{it}</li>
                      ))}
                    </ul>
                  </div>
                </Item>
              );
            })}
          </Stagger>
        </div>
      </section>

      {/* Feature highlights (alternating) */}
      <section className="mx-auto max-w-6xl space-y-20 px-5 py-20">
        <LuxHeading eyebrow="Built-in, Not Bolted-on" title={<>Every tool your shop runs on, <span className="gold-text">beautifully designed</span></>} />
        {FEATURES.map((f, i) => {
          const I = Icon[f.icon];
          const flip = i % 2 === 1;
          return (
            <Reveal key={f.title}>
              <div className="grid items-center gap-8 md:grid-cols-2">
                <div className={flip ? "md:order-2" : ""}>
                  <span className="grid h-12 w-12 place-items-center rounded-2xl border border-brass/25 bg-gradient-to-br from-brass/15 to-transparent text-brass"><I className="h-6 w-6" /></span>
                  <h3 className="mt-4 font-display text-2xl text-cream">{f.title}</h3>
                  <p className="mt-3 text-cream/60">{f.copy}</p>
                  <ul className="mt-4 space-y-2">
                    {f.bullets.map((b) => <li key={b} className="flex items-center gap-2.5 text-sm text-cream/70"><Icon.check className="h-4 w-4 shrink-0 text-brass" />{b}</li>)}
                  </ul>
                </div>
                <div className={`relative flex justify-center ${flip ? "md:order-1" : ""}`}>
                  <div className="pointer-events-none absolute -inset-6 -z-10 rounded-[2.5rem] bg-[radial-gradient(circle_at_50%_50%,rgba(216,178,92,0.12),transparent_70%)] blur-2xl" />
                  <Mock kind={f.mock} />
                </div>
              </div>
            </Reveal>
          );
        })}
      </section>

      {/* Benefits */}
      <section className="mx-auto max-w-7xl px-5 py-20">
        <LuxHeading eyebrow="The Payoff" title={<>What it means for <span className="gold-text">your shop</span></>} />
        <Stagger className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3" gap={0.06}>
          {BENEFITS.map((b) => {
            const I = Icon[b.icon];
            return (
              <Item key={b.title}>
                <div className="lux-card group h-full p-6">
                  <span className="grid h-12 w-12 place-items-center rounded-2xl border border-brass/25 bg-gradient-to-br from-brass/15 to-transparent text-brass transition group-hover:scale-105"><I className="h-6 w-6" /></span>
                  <h3 className="mt-5 text-lg font-semibold text-cream">{b.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-cream/55">{b.copy}</p>
                </div>
              </Item>
            );
          })}
        </Stagger>
      </section>

      <LuxCTA
        title={<>Spend less time managing your shop and <span className="gold-text">more time growing it.</span></>}
        sub="Start free today — no credit card required. Set up your shop in minutes."
        actions={[{ label: "Start Free", href: "/signup", primary: true }, { label: "View Pricing", href: "/pricing" }]}
      />
    </LuxPage>
  );
}
