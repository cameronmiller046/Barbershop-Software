import Link from "next/link";
import { MarketingHeader } from "@/components/MarketingHeader";
import { MarketingFooter } from "@/components/MarketingFooter";
import { ScissorsIcon, RazorIcon, CombIcon, PoleIcon } from "@/components/BarberIcons";
import { FEATURES, TIER_META, type FeatureIcon } from "@/lib/featureContent";

export const metadata = {
  title: "Features",
  description: "Everything a barbershop needs: branded website, online booking + QR, chair-side portal, owner reports, and privacy-first analytics.",
};

const ICONS: Record<FeatureIcon, typeof ScissorsIcon> = {
  scissors: ScissorsIcon, razor: RazorIcon, comb: CombIcon, pole: PoleIcon,
};

export default function FeaturesPage() {
  return (
    <div className="min-h-screen">
      <MarketingHeader />
      <section className="container-page py-16">
        <h1 className="font-display text-4xl md:text-5xl">Features</h1>
        <p className="mt-3 max-w-xl text-cream/70">
          Everything you need to run an appointment-based business. Tap a feature
          to see it in detail — with screenshots and the plan it&apos;s on. 👇
        </p>

        <div className="mt-10 grid gap-5 md:grid-cols-2">
          {FEATURES.map((f) => {
            const Icon = ICONS[f.icon];
            const tier = TIER_META[f.tier];
            return (
              <Link key={f.slug} href={`/features/${f.slug}`} className="card card-hover group block">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="grid h-10 w-10 place-items-center rounded-xl bg-barber/20 text-flame"><Icon size={20} /></span>
                    <h2 className="font-display text-2xl text-brass">{f.emoji} {f.title}</h2>
                  </div>
                  <span className={`badge shrink-0 ${tier.badge}`}>{tier.label}</span>
                </div>
                <p className="mt-3 text-sm text-cream/70">{f.blurb}</p>
                <ul className="mt-4 space-y-2 text-sm text-cream/75">
                  {f.bullets.slice(0, 3).map((it) => (
                    <li key={it} className="flex gap-2"><span className="text-brass">✓</span><span>{it}</span></li>
                  ))}
                </ul>
                <span className="mt-4 inline-block text-sm text-flame group-hover:underline">Explore {f.title} →</span>
              </Link>
            );
          })}
        </div>

        <div className="mt-12">
          <Link href="/beta" className="btn-primary px-7 py-3 text-base">✨ Request beta access</Link>
        </div>
      </section>
      <MarketingFooter />
    </div>
  );
}
