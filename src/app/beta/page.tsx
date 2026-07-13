import type { Metadata } from "next";
import { LuxPage } from "@/components/home/LuxPage";
import { LuxHeading } from "@/components/home/LuxBits";
import { Reveal, Stagger, Item } from "@/components/home/motion";
import { Icon, type IconName } from "@/components/home/icons";
import { BetaForm } from "@/components/BetaForm";

export const metadata: Metadata = {
  title: "Request Beta Access — The Chair",
  description: "Apply for early access to The Chair. We review every application by hand and set up your branded booking site and staff portal for you.",
  alternates: { canonical: "/beta" },
  openGraph: { title: "The Chair — Request Beta Access", description: "Early access to the all-in-one platform for modern barbershops.", url: "/beta", type: "website" },
};

const PERKS: { icon: IconName; title: string; copy: string }[] = [
  { icon: "store", title: "Your branded booking site", copy: "A polished storefront at your own link — services, barbers, and 24/7 online booking, set up for you." },
  { icon: "staff", title: "A full staff portal", copy: "Appointments, clients, check-in, time clock, and owner reports — everything your team runs the day on." },
  { icon: "spark", title: "White-glove setup", copy: "We review every application by hand and configure your shop, so you're live without lifting a finger." },
];

export default function BetaPage() {
  return (
    <LuxPage>
      <section className="relative z-10 mx-auto max-w-6xl px-5 pb-24 pt-36 sm:pt-44">
        <LuxHeading
          eyebrow="Beta Access"
          title={<>Request <span className="gold-text">early access</span></>}
          sub="Tell us about your shop. We review every application by hand and set up your branded site and portal for you."
        />

        <div className="mt-14 grid items-start gap-10 lg:grid-cols-[1fr_1.05fr]">
          {/* Perks */}
          <Stagger className="space-y-4" gap={0.08}>
            {PERKS.map((p) => {
              const I = Icon[p.icon];
              return (
                <Item key={p.title}>
                  <div className="lux-card flex gap-4 p-5">
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-brass/25 bg-gradient-to-br from-brass/15 to-transparent text-brass">
                      <I className="h-5 w-5" />
                    </span>
                    <div>
                      <h3 className="font-semibold text-cream">{p.title}</h3>
                      <p className="mt-1 text-sm leading-relaxed text-cream/60">{p.copy}</p>
                    </div>
                  </div>
                </Item>
              );
            })}
            <Item>
              <p className="flex items-center gap-2 px-1 pt-1 text-sm text-cream/45">
                <Icon.check className="h-4 w-4 text-brass" /> No credit card. No commitment. Flat monthly pricing when you launch.
              </p>
            </Item>
          </Stagger>

          {/* Form */}
          <Reveal delay={0.1}>
            <BetaForm />
          </Reveal>
        </div>
      </section>
    </LuxPage>
  );
}
