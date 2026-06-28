import Link from "next/link";
import { MarketingHeader } from "@/components/MarketingHeader";
import { MarketingFooter } from "@/components/MarketingFooter";

export const metadata = { title: "Pricing — The Chair" };

const TIERS = [
  { name: "Trial", price: "Free", note: "During closed beta", features: ["1 shop", "Online booking", "Barber portal", "Email confirmations"], cta: "Request access", highlight: false },
  { name: "Starter", price: "$29", note: "per shop / month", features: ["Everything in Trial", "Up to 3 barbers", "Gallery & reviews", "Analytics"], cta: "Request access", highlight: true },
  { name: "Pro", price: "$79", note: "per shop / month", features: ["Everything in Starter", "Unlimited barbers", "Social planning", "Priority support"], cta: "Request access", highlight: false },
];

export default function PricingPage() {
  return (
    <div className="min-h-screen">
      <MarketingHeader />
      <section className="container-page py-16">
        <h1 className="font-display text-4xl md:text-5xl">Simple, per-shop pricing</h1>
        <p className="mt-3 max-w-xl text-cream/70">
          Billing activates after beta. Today, onboarding is free and manual — we
          set up your shop for you.
        </p>
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {TIERS.map((t) => (
            <div
              key={t.name}
              className={`card flex flex-col ${t.highlight ? "border-brass" : ""}`}
            >
              {t.highlight && <span className="badge mb-2 w-max bg-brass text-ink">Most popular</span>}
              <h2 className="font-display text-2xl">{t.name}</h2>
              <div className="mt-2">
                <span className="text-4xl font-bold">{t.price}</span>
                <span className="ml-1 text-sm text-cream/50">{t.note}</span>
              </div>
              <ul className="mt-5 flex-1 space-y-2 text-sm text-cream/75">
                {t.features.map((f) => (
                  <li key={f} className="flex gap-2"><span className="text-brass">✓</span>{f}</li>
                ))}
              </ul>
              <Link href="/beta" className={`mt-6 ${t.highlight ? "btn-primary" : "btn-ghost"}`}>
                {t.cta}
              </Link>
            </div>
          ))}
        </div>
        <p className="mt-8 text-xs text-cream/40">
          Billing &amp; subscriptions (Phase 6) are on the roadmap; pricing shown is indicative.
        </p>
      </section>
      <MarketingFooter />
    </div>
  );
}
