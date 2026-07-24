import type { Metadata } from "next";
import Link from "next/link";
import { LuxPage } from "@/components/home/LuxPage";
import { LuxHeading, LuxCTA } from "@/components/home/LuxBits";
import { Reveal, Stagger, Item } from "@/components/home/motion";
import { Icon, type IconName } from "@/components/home/icons";
import { DashboardMock, PhoneMock, TabletMock } from "@/components/home/mockups";

export const metadata: Metadata = {
  title: "Features — everything to run and grow your barbershop",
  description:
    "Explore every feature of The Chair: online booking, branded website, self check-in kiosk, chair-side dashboard, client profiles, staff scheduling, analytics, reports, loyalty, and more — all in one platform.",
  alternates: { canonical: "/features" },
  openGraph: { title: "The Chair — Features", description: "Booking, portal, kiosk, analytics, and growth tools — one platform built for barbershops.", url: "/features", type: "website" },
};

type Feat = { icon: IconName; title: string; desc: string };
const CATEGORIES: { eyebrow: string; title: React.ReactNode; sub: string; items: Feat[] }[] = [
  {
    eyebrow: "Get Booked",
    title: <>Fill every <span className="gold-text">chair</span></>,
    sub: "Turn visitors into booked clients, day or night.",
    items: [
      { icon: "booking", title: "Online Booking", desc: "Clients book, reschedule, and cancel themselves 24/7 — in under a minute, on any phone." },
      { icon: "store", title: "Branded Website", desc: "A professional, mobile-first site with your brand, services, gallery, and a printable QR code." },
      { icon: "checkin", title: "Self Check-In Kiosk", desc: "Put a tablet at the front desk so clients check themselves in and join the walk-in queue." },
      { icon: "users", title: "Walk-In Management", desc: "Log walk-ins in seconds and manage the queue with live wait estimates." },
      { icon: "messages", title: "Email Confirmations", desc: "Automatic confirmations and reminders that cut no-shows and keep clients informed." },
      { icon: "calendar", title: "Real Availability", desc: "Slots come from each barber's hours and existing bookings — never a double-booked chair." },
    ],
  },
  {
    eyebrow: "Run Your Shop",
    title: <>Your whole floor, <span className="gold-text">one screen</span></>,
    sub: "Everything you need to run a busy day, calmly.",
    items: [
      { icon: "gauge", title: "Chair-Side Dashboard", desc: "Today's appointments, revenue, and the live queue — barbers see their chair, managers see the floor." },
      { icon: "profiles", title: "Client Profiles", desc: "Full visit history, preferences, and private notes for a personal cut every time." },
      { icon: "checkin", title: "Check-In / Check-Out", desc: "Arrival to checkout in a few taps — check in, start the timer, complete the cut." },
      { icon: "clock", title: "Turnaround Timer", desc: "Track service time on every cut so you know your real turnaround and pace." },
      { icon: "staff", title: "Staff & Scheduling", desc: "Set each barber's hours, manage chairs, and keep the whole team in sync." },
      { icon: "shield", title: "Role-Based Permissions", desc: "Control exactly what barbers vs. managers can see and do — one portal, adapted per role." },
    ],
  },
  {
    eyebrow: "Grow Your Business",
    title: <>Turn data into <span className="gold-text">decisions</span></>,
    sub: "Understand your shop and grow revenue with confidence.",
    items: [
      { icon: "analytics", title: "Advanced Analytics", desc: "Busiest hours, top-performing barbers, retention, cancellations, and turnaround times." },
      { icon: "reports", title: "Owner Reports", desc: "Monthly sales goals with pace, 12-month revenue trends, and per-barber earnings." },
      { icon: "dollar", title: "Revenue Dashboard", desc: "See daily and weekly revenue and exactly what each barber collected." },
      { icon: "loyalty", title: "Loyalty & Memberships", desc: "Reward regulars and add recurring revenue with memberships and gift cards." },
      { icon: "star", title: "Reviews & Gallery", desc: "Collect reviews and showcase your best work to win new clients." },
      { icon: "growth", title: "Customer Retention", desc: "Rebooking prompts and insights that keep clients coming back." },
    ],
  },
];

const DEEP: { icon: IconName; tag: string; title: string; copy: string; bullets: string[]; mock: "dash" | "phone" | "tablet" }[] = [
  { icon: "booking", tag: "Booking", title: "Booking that works while you sleep", copy: "A clean flow lets clients pick a barber, service, and time in under a minute — no app, no account. Availability is always accurate to your hours and your timezone.", bullets: ["Self-serve reschedule & cancel", "Email confirmations", "No double-bookings, ever"], mock: "phone" },
  { icon: "gauge", tag: "Operations", title: "Run the day from one calm dashboard", copy: "The moment you sign in, you see what needs your attention: who's booked, who's waiting, who's in the chair, and how the day's revenue is tracking.", bullets: ["Live check-in queue", "Current-client service timer", "Role-aware for barbers & admins"], mock: "dash" },
  { icon: "checkin", tag: "Front Desk", title: "A self check-in kiosk for busy shops", copy: "Set a tablet at the front desk. Clients find their record or register, pick a service, and choose a barber — then join the queue with a live wait estimate.", bullets: ["Search by phone, email, or name", "Next-available or pick-a-barber", "Flows into the same live queue"], mock: "tablet" },
];

const EVERYTHING = [
  "Unlimited appointments", "Online booking + QR code", "Branded shop website", "Email confirmations", "Walk-in management", "Self check-in kiosk",
  "Real-time booking calendar", "Client profiles & history", "Private client notes", "Check-in / check-out", "Turnaround timer", "Staff scheduling",
  "Role-based permissions", "Owner reports & sales goals", "Revenue dashboard", "Advanced analytics", "Loyalty program", "Memberships & gift cards",
  "Reviews & photo gallery", "No-show tracking", "Multi-location support", "SMS reminders", "Secure cloud storage", "Priority support",
];

function Mock({ kind }: { kind: "dash" | "phone" | "tablet" }) {
  if (kind === "phone") return <PhoneMock />;
  if (kind === "tablet") return <TabletMock />;
  return <DashboardMock />;
}

export default function FeaturesPage() {
  return (
    <LuxPage>
      {/* Hero */}
      <section className="mx-auto max-w-4xl px-5 pt-36 text-center sm:pt-44">
        <Reveal><div className="text-xs font-semibold uppercase tracking-[0.24em] text-brass/80">Features</div></Reveal>
        <Reveal delay={0.05}>
          <h1 className="mt-4 font-display text-[2.6rem] font-medium leading-[1.05] tracking-tight text-cream sm:text-6xl">
            Powerful features. <span className="gold-text">Beautifully simple.</span>
          </h1>
        </Reveal>
        <Reveal delay={0.12}>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-cream/60">
            Everything your barbershop needs to get booked, run the day, and grow — thoughtfully designed
            and working together in one premium platform.
          </p>
        </Reveal>
        <Reveal delay={0.18}>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href="/signup" className="btn-gold text-base">Start Free <Icon.arrow className="h-4 w-4" /></Link>
            <Link href="/pricing" className="btn-outline-gold text-base">View Pricing</Link>
          </div>
        </Reveal>
      </section>

      {/* Category grids */}
      {CATEGORIES.map((cat) => (
        <section key={cat.eyebrow} className="mx-auto max-w-7xl px-5 py-16">
          <LuxHeading eyebrow={cat.eyebrow} title={cat.title} sub={cat.sub} />
          <Stagger className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3" gap={0.05}>
            {cat.items.map((f) => {
              const I = Icon[f.icon];
              return (
                <Item key={f.title}>
                  <div className="lux-card group h-full p-6">
                    <span className="grid h-12 w-12 place-items-center rounded-2xl border border-brass/25 bg-gradient-to-br from-brass/15 to-transparent text-brass transition group-hover:scale-105"><I className="h-6 w-6" /></span>
                    <h3 className="mt-5 text-lg font-semibold text-cream">{f.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-cream/55">{f.desc}</p>
                  </div>
                </Item>
              );
            })}
          </Stagger>
        </section>
      ))}

      {/* Deep dives */}
      <section className="mx-auto max-w-6xl space-y-20 px-5 py-16">
        <LuxHeading eyebrow="A Closer Look" title={<>See the standout features <span className="gold-text">in action</span></>} />
        {DEEP.map((d, i) => {
          const I = Icon[d.icon];
          const flip = i % 2 === 1;
          return (
            <Reveal key={d.title}>
              <div className="grid items-center gap-8 md:grid-cols-2">
                <div className={flip ? "md:order-2" : ""}>
                  <div className="inline-flex items-center gap-2 rounded-full border border-brass/25 bg-brass/[0.06] px-3 py-1 text-xs text-brass/90"><I className="h-3.5 w-3.5" /> {d.tag}</div>
                  <h3 className="mt-4 font-display text-2xl text-cream sm:text-3xl">{d.title}</h3>
                  <p className="mt-3 text-cream/60">{d.copy}</p>
                  <ul className="mt-4 space-y-2">
                    {d.bullets.map((b) => <li key={b} className="flex items-center gap-2.5 text-sm text-cream/70"><Icon.check className="h-4 w-4 shrink-0 text-brass" />{b}</li>)}
                  </ul>
                </div>
                <div className={`relative flex justify-center ${flip ? "md:order-1" : ""}`}>
                  <div className="pointer-events-none absolute -inset-6 -z-10 rounded-[2.5rem] bg-[radial-gradient(circle_at_50%_50%,rgba(216,178,92,0.12),transparent_70%)] blur-2xl" />
                  <Mock kind={d.mock} />
                </div>
              </div>
            </Reveal>
          );
        })}
      </section>

      {/* Everything included */}
      <section className="mx-auto max-w-6xl px-5 py-16">
        <LuxHeading eyebrow="All In" title={<>Everything <span className="gold-text">included</span></>} sub="No add-ons for the essentials — the core of every plan." />
        <Reveal delay={0.05}>
          <div className="mt-12 rounded-3xl border border-white/10 bg-white/[0.02] p-7 sm:p-10">
            <ul className="grid gap-x-8 gap-y-3.5 sm:grid-cols-2 lg:grid-cols-3">
              {EVERYTHING.map((f) => (
                <li key={f} className="flex items-center gap-2.5 text-sm text-cream/75"><Icon.check className="h-4 w-4 shrink-0 text-brass" />{f}</li>
              ))}
            </ul>
          </div>
        </Reveal>
        <Reveal className="mt-6 text-center text-sm text-cream/45">
          Some advanced features unlock as you grow. <Link href="/pricing" className="text-brass hover:underline">Compare plans →</Link>
        </Reveal>
      </section>

      <LuxCTA
        title={<>One platform for <span className="gold-text">everything your shop does.</span></>}
        sub="Start free today — set up your shop in minutes, no credit card required."
        actions={[{ label: "Start Free", href: "/signup", primary: true }, { label: "View Pricing", href: "/pricing" }]}
      />
    </LuxPage>
  );
}
