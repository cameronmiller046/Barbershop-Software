import Link from "next/link";
import { MarketingHeader } from "@/components/MarketingHeader";
import { MarketingFooter } from "@/components/MarketingFooter";
import { Reveal } from "@/components/Reveal";
import { ScissorsIcon, RazorIcon, CombIcon, PoleIcon } from "@/components/BarberIcons";
import { FEATURES, TIER_META, type FeatureIcon } from "@/lib/featureContent";

export const metadata = {
  title: "Features",
  description: "Everything a barbershop needs: branded website, online booking + QR, chair-side portal, owner reports, and privacy-first analytics.",
};

const ICONS: Record<FeatureIcon, typeof ScissorsIcon> = {
  scissors: ScissorsIcon, razor: RazorIcon, comb: CombIcon, pole: PoleIcon,
};

export default function FeaturesIndex() {
  return (
    <div className="relative min-h-screen overflow-x-hidden mkt">
      <MarketingHeader />

      <section className="container-page py-20 text-center">
        <Reveal>
          <span className="mb-5 inline-flex items-center gap-2 rounded-full border border-flame/30 bg-flame/5 px-4 py-1.5 text-sm font-medium text-flame">
            <PoleIcon size={16} /> Everything The Chair does
          </span>
          <h1 className="mx-auto max-w-3xl font-display text-4xl leading-[1.05] md:text-6xl">
            Everything your shop needs, in one <span className="text-shimmer">chair.</span>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-cream/70">
            A branded website, effortless booking, a chair-side portal, and owner
            reports — one platform built from the ground up for barbershops. Explore
            each feature in depth. 👇
          </p>
        </Reveal>
      </section>

      <section className="container-page pb-16">
        <div className="mx-auto grid max-w-5xl gap-5 md:grid-cols-2">
          {FEATURES.map((f, i) => {
            const Icon = ICONS[f.icon];
            const tier = TIER_META[f.tier];
            return (
              <Reveal key={f.slug} delay={i * 60}>
                <Link href={`/features/${f.slug}`} className="group block h-full">
                  <div className="card-hover flex h-full flex-col overflow-hidden rounded-2xl border border-white/10 bg-charcoal p-0">
                    <div className="flex items-center gap-3 border-b border-white/10 p-5">
                      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-barber/20 text-flame"><Icon size={20} /></span>
                      <div className="min-w-0">
                        <h2 className="font-display text-lg text-brass">{f.emoji} {f.title}</h2>
                        <p className="text-xs text-cream/50">{f.tag}</p>
                      </div>
                      <span className={`badge ml-auto shrink-0 ${tier.badge}`}>{tier.label}</span>
                    </div>
                    <div className="flex flex-1 flex-col p-5">
                      <p className="text-sm text-cream/70">{f.blurb}</p>
                      <span className="mt-4 inline-block text-sm text-flame group-hover:underline">Explore {f.title} →</span>
                    </div>
                  </div>
                </Link>
              </Reveal>
            );
          })}
        </div>
      </section>

      <section className="container-page py-12 text-center">
        <h2 className="font-display text-3xl">Ready to modernize your shop? 💈</h2>
        <p className="mx-auto mt-2 max-w-md text-cream/70">Flat monthly price, no per-booking fees.</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link href="/beta" className="btn-barber px-7 py-3 text-base">✨ Request beta access</Link>
          <Link href="/pricing" className="btn-ghost px-7 py-3 text-base">See pricing 💰</Link>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}
