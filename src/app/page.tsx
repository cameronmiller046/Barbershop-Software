import type { Metadata } from "next";
import { LuxNav } from "@/components/home/LuxNav";
import { Hero } from "@/components/home/Hero";
import { Features, Showcase, HowItWorks, Stats, Testimonials, Integrations, Pricing, FinalCTA } from "@/components/home/sections";
import { Footer } from "@/components/home/Footer";
import { jsonLdSafe } from "@/lib/utils";

export const metadata: Metadata = {
  title: { absolute: "The Chair — All-in-one barbershop software 💈" },
  description:
    "The Chair is the all-in-one platform for barbershops: online booking, customer management, staff, inventory, payments, and business growth. Flat monthly price, no per-booking fees. Start free.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "The Chair — All-in-one barbershop software",
    description: "Bookings, customers, staff, payments, and growth — one premium platform built for barbershops.",
    url: "/",
    type: "website",
  },
};

// Deterministic ember positions (no Math.random → no hydration mismatch).
const EMBERS = [
  { l: "8%", s: 3, d: 14, delay: 0 }, { l: "18%", s: 2, d: 18, delay: 3 },
  { l: "28%", s: 4, d: 12, delay: 6 }, { l: "40%", s: 2, d: 20, delay: 1 },
  { l: "52%", s: 3, d: 15, delay: 4 }, { l: "63%", s: 2, d: 19, delay: 8 },
  { l: "72%", s: 4, d: 13, delay: 2 }, { l: "83%", s: 3, d: 17, delay: 5 },
  { l: "92%", s: 2, d: 21, delay: 7 }, { l: "35%", s: 3, d: 16, delay: 9 },
  { l: "58%", s: 2, d: 22, delay: 2.5 }, { l: "77%", s: 3, d: 14, delay: 6.5 },
];

const JSON_LD = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "The Chair",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  description:
    "All-in-one barbershop software — online booking, customer management, staff, inventory, payments, reports, and growth tools.",
  offers: { "@type": "Offer", price: "29", priceCurrency: "USD" },
  aggregateRating: { "@type": "AggregateRating", ratingValue: "4.9", ratingCount: "120", bestRating: "5" },
};

export default function Home() {
  return (
    <div className="lux relative min-h-screen">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdSafe(JSON_LD) }} />

      {/* Cinematic atmosphere */}
      <div className="lux-atmosphere" aria-hidden />
      <div className="lux-grain" aria-hidden />
      {/* Floating embers over the hero region */}
      <div className="lux-embers absolute inset-x-0 top-0 h-[110vh]" aria-hidden>
        {EMBERS.map((e, i) => (
          <span key={i} className="lux-ember" style={{ left: e.l, width: e.s, height: e.s, animationDuration: `${e.d}s`, animationDelay: `${e.delay}s` }} />
        ))}
      </div>

      <LuxNav />

      <main className="relative">
        <Hero />
        <Features />
        <Showcase />
        <HowItWorks />
        <Stats />
        <Testimonials />
        <Integrations />
        <Pricing />
        <FinalCTA />
      </main>

      <Footer />
    </div>
  );
}
