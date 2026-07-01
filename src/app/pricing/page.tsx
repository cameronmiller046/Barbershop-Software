import Link from "next/link";
import { MarketingHeader } from "@/components/MarketingHeader";
import { MarketingFooter } from "@/components/MarketingFooter";
import { BrowserFrame, BookingScreen, ReportsPreview } from "@/components/marketing/Previews";

export const metadata = {
  title: "Pricing",
  description: "Flat monthly barbershop software pricing with no per-booking fees. Free Solo plan, $39 Pro, $89 Growth. Up to half the price of Squire and Booksy.",
};

const TIERS = [
  { name: "🪑 Solo", price: "$29", note: "per shop / month · 1 chair", features: ["Branded booking page", "Online booking + QR code", "Chair-side portal", "Email confirmations"], cta: "Start 14-day trial", highlight: false },
  { name: "✂️ Pro", price: "$39", note: "per shop / month", features: ["Everything in Solo", "Up to 6 barbers", "Owner reports & sales goals", "Reviews & photo gallery", "No-show tracking"], cta: "Start 14-day trial", highlight: true },
  { name: "🏢 Enterprise", price: "$129", note: "per shop / month", features: ["Everything in Pro", "Unlimited barbers", "Multi-location dashboard", "Advanced analytics", "Dedicated support & onboarding"], cta: "Talk to sales", highlight: false },
];

export default function PricingPage() {
  return (
    <div className="min-h-screen">
      <MarketingHeader />
      <section className="container-page py-16">
        <div className="eyebrow">💈 Simple, honest pricing</div>
        <h1 className="mt-2 font-display text-4xl md:text-5xl">Pricing that pays for itself 💰</h1>
        <p className="mt-3 max-w-xl text-cream/70">
          Flat monthly price per shop — <span className="text-cream">no per-booking fees, ever</span>.
          Up to half the price of Squire, Booksy, and Schedulicity. ✅
        </p>
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {TIERS.map((t) => (
            <div
              key={t.name}
              className={`card flex flex-col ${t.highlight ? "border-brass" : ""}`}
            >
              {t.highlight && <span className="badge mb-2 w-max bg-barber text-cream">Most popular</span>}
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
        <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-cream/60">
          <span>✅ No per-booking fees</span>
          <span>🔓 Cancel anytime</span>
          <span>💳 No credit card to start</span>
          <span>📅 14-day free trial</span>
        </div>

        <div className="mt-16 grid items-center gap-8 md:grid-cols-2">
          <div>
            <div className="eyebrow">Included on every plan</div>
            <h2 className="mt-2 font-display text-3xl">A booking page that converts</h2>
            <p className="mt-3 text-cream/70">
              Every shop gets a fast, mobile-first booking flow — pick a barber, a
              service, and a time in under a minute.
            </p>
          </div>
          <BrowserFrame url="yourshop.thechair.app/book"><BookingScreen /></BrowserFrame>
        </div>

        <div className="mt-14 grid items-center gap-8 md:grid-cols-2">
          <div className="md:order-2">
            <div className="eyebrow">Starter &amp; up</div>
            <h2 className="mt-2 font-display text-3xl">Owner reports built in</h2>
            <p className="mt-3 text-cream/70">
              Track your monthly sales goal, pace, and revenue trend — no
              spreadsheets, no add-ons.
            </p>
          </div>
          <div className="md:order-1"><BrowserFrame url="yourshop.thechair.app/portal/reports"><ReportsPreview /></BrowserFrame></div>
        </div>
      </section>
      <MarketingFooter />
    </div>
  );
}
