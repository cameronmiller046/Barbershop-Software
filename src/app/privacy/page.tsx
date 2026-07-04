import type { Metadata } from "next";
import Link from "next/link";
import { Footer } from "@/components/home/Footer";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How The Chair collects, uses, and protects barbershop and customer data.",
};

const SECTIONS: { h: string; p: string }[] = [
  { h: "1. Information we collect", p: "We collect the information you provide when you create an account and run your shop — your name, email, shop details, staff, services, and the client and appointment records you enter. We also collect basic, privacy-first usage analytics (page views and referrers) to improve the product." },
  { h: "2. How we use it", p: "We use your information to provide and operate the service: powering bookings, the chair-side portal, reports, notifications, and payments. We do not sell your data, and we do not share client lists between shops." },
  { h: "3. Data ownership & isolation", p: "Each shop's data is isolated to that shop (tenant). You own your data. You can export or request deletion of your data at any time by contacting us." },
  { h: "4. Payments", p: "Card payments are processed by our payment partners; we do not store full card numbers on our servers." },
  { h: "5. Security", p: "We use industry-standard encryption in transit, hashed passwords, and role-based access controls to protect your account." },
  { h: "6. Contact", p: "Questions about privacy? Reach us through the contact page and we'll respond promptly." },
];

export default function PrivacyPage() {
  return (
    <div className="lux relative min-h-screen">
      <div className="lux-atmosphere" aria-hidden />
      <div className="lux-grain" aria-hidden />
      <div className="relative z-10 mx-auto max-w-3xl px-5 py-20">
        <Link href="/" className="text-sm text-brass hover:underline">← Back home</Link>
        <h1 className="mt-6 font-display text-4xl font-medium tracking-tight text-cream sm:text-5xl">Privacy Policy</h1>
        <p className="mt-3 text-cream/50">Last updated {new Date().getFullYear()}. This summary explains how The Chair handles your data.</p>
        <div className="mt-10 space-y-8">
          {SECTIONS.map((s) => (
            <section key={s.h}>
              <h2 className="text-lg font-semibold text-cream">{s.h}</h2>
              <p className="mt-2 leading-relaxed text-cream/65">{s.p}</p>
            </section>
          ))}
        </div>
      </div>
      <Footer />
    </div>
  );
}
