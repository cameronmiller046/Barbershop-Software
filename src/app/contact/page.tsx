import type { Metadata } from "next";
import { LuxPage } from "@/components/home/LuxPage";
import { LuxCTA } from "@/components/home/LuxBits";
import { Reveal, Stagger, Item } from "@/components/home/motion";
import { Icon, type IconName } from "@/components/home/icons";
import { Faq, type Qa } from "@/components/pricing/Faq";
import { ContactForm } from "@/components/contact/ContactForm";

export const metadata: Metadata = {
  title: "Contact — sales, support & partnerships",
  description:
    "Get in touch with The Chair for sales, technical support, partnerships, or general questions. We typically respond within one business day.",
  alternates: { canonical: "/contact" },
  openGraph: { title: "The Chair — Contact", description: "Reach out for sales, support, or partnerships. We're here to help.", url: "/contact", type: "website" },
};

const OPTIONS: { icon: IconName; title: string; copy: string; cta: string }[] = [
  { icon: "growth", title: "Sales", copy: "Interested in growing your business with The Chair.", cta: "Talk to sales" },
  { icon: "headset", title: "Support", copy: "Need technical assistance with your account.", cta: "Get support" },
  { icon: "customers", title: "Partnerships", copy: "Want to work together? Let's talk.", cta: "Partner with us" },
  { icon: "messages", title: "General Questions", copy: "Anything else — we're happy to help.", cta: "Say hello" },
];

const OFFICE: { icon: IconName; title: string; lines: string[] }[] = [
  { icon: "clock", title: "Business Hours", lines: ["Mon–Fri · 9:00am – 6:00pm ET", "Weekends · Limited support"] },
  { icon: "messages", title: "Email", lines: ["hello@thechair.co", "sales@thechair.co"] },
  { icon: "headset", title: "Phone", lines: ["+1 (555) 012-3456", "Mon–Fri business hours"] },
  { icon: "store", title: "Headquarters", lines: ["The Chair, Inc.", "Atlanta, GA · USA"] },
  { icon: "shield", title: "Support Availability", lines: ["Priority support on Pro+", "24/7 status & uptime monitoring"] },
];

const FAQ: Qa[][] = [
  [
    { q: "How quickly do you respond?", a: "We reply to most messages within one business day — often much sooner. Priority-support customers get faster response times." },
    { q: "Do you offer onboarding?", a: "Yes. We help you set up your shop, import your clients, and get your team comfortable — included on every plan." },
    { q: "Can I schedule a demo?", a: "Absolutely. Choose \"Book a demo\" in the form and we'll set up a walkthrough tailored to your shop." },
  ],
  [
    { q: "Do you provide phone support?", a: "Yes — phone support is available during business hours, and Pro and Shop plans include priority support." },
    { q: "Can I migrate from another system?", a: "Definitely. We'll help you import your existing clients and appointments from a spreadsheet or another platform." },
  ],
];

export default function ContactPage() {
  return (
    <LuxPage>
      {/* Hero */}
      <section className="mx-auto max-w-3xl px-5 pt-36 text-center sm:pt-44">
        <Reveal><div className="text-xs font-semibold uppercase tracking-[0.24em] text-brass/80">Contact us</div></Reveal>
        <Reveal delay={0.05}>
          <h1 className="mt-4 font-display text-[2.6rem] font-medium leading-[1.05] tracking-tight text-cream sm:text-6xl">
            We&apos;re here to <span className="gold-text">help.</span>
          </h1>
        </Reveal>
        <Reveal delay={0.12}>
          <p className="mx-auto mt-6 max-w-xl text-lg text-cream/60">
            Reach out for sales, support, partnerships, or general questions — whatever you need, our team is ready.
          </p>
        </Reveal>
      </section>

      {/* Contact options */}
      <section className="mx-auto max-w-7xl px-5 py-16">
        <Stagger className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" gap={0.07}>
          {OPTIONS.map((o) => {
            const I = Icon[o.icon];
            return (
              <Item key={o.title}>
                <a href="#contact-form" className="lux-card group flex h-full flex-col p-6">
                  <span className="grid h-12 w-12 place-items-center rounded-2xl border border-brass/25 bg-gradient-to-br from-brass/15 to-transparent text-brass transition group-hover:scale-105"><I className="h-6 w-6" /></span>
                  <h3 className="mt-5 text-lg font-semibold text-cream">{o.title}</h3>
                  <p className="mt-2 flex-1 text-sm leading-relaxed text-cream/55">{o.copy}</p>
                  <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-brass">{o.cta} <Icon.arrow className="h-4 w-4 transition group-hover:translate-x-0.5" /></span>
                </a>
              </Item>
            );
          })}
        </Stagger>
      </section>

      {/* Form + office info */}
      <section id="contact-form" className="mx-auto max-w-7xl scroll-mt-28 px-5 py-10">
        <div className="grid gap-8 lg:grid-cols-[1.3fr_1fr]">
          <Reveal>
            <h2 className="font-display text-3xl text-cream">Send us a message</h2>
            <p className="mt-2 text-cream/55">Fill out the form and the right person on our team will be in touch.</p>
            <div className="mt-6"><ContactForm /></div>
          </Reveal>

          <Reveal delay={0.1}>
            <div className="space-y-4">
              {OFFICE.map((o) => {
                const I = Icon[o.icon];
                return (
                  <div key={o.title} className="p-panel flex items-start gap-4 p-5">
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-brass/25 bg-brass/[0.06] text-brass"><I className="h-5 w-5" /></span>
                    <div>
                      <div className="text-sm font-semibold text-cream">{o.title}</div>
                      {o.lines.map((l) => <div key={l} className="text-sm text-cream/55">{l}</div>)}
                    </div>
                  </div>
                );
              })}
            </div>
          </Reveal>
        </div>
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-4xl px-5 py-16">
        <Reveal className="mb-10 text-center">
          <h2 className="font-display text-4xl font-medium tracking-tight text-cream">Common <span className="gold-text">questions</span></h2>
        </Reveal>
        <Reveal delay={0.05}><Faq columns={FAQ} gridClassName="grid gap-4 md:grid-cols-2" /></Reveal>
      </section>

      <LuxCTA
        title={<>Let&apos;s build something <span className="gold-text">great together.</span></>}
        sub="Start free in minutes, or book a personalized demo with our team."
        actions={[{ label: "Start Free", href: "/signup", primary: true }, { label: "Book a Demo", href: "#contact-form" }]}
      />
    </LuxPage>
  );
}
