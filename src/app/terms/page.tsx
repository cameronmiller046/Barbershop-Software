import type { Metadata } from "next";
import Link from "next/link";
import { Footer } from "@/components/home/Footer";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "The terms that govern your use of The Chair barbershop software.",
};

const SECTIONS: { h: string; p: string }[] = [
  { h: "1. Agreement", p: "By creating an account or using The Chair, you agree to these terms. If you're using the service on behalf of a shop, you agree on the shop's behalf." },
  { h: "2. Your account", p: "You're responsible for keeping your login credentials secure and for the activity of the staff and device accounts you create, including self-check-in kiosks." },
  { h: "3. Acceptable use", p: "Use the service lawfully. Don't attempt to disrupt the platform, access other shops' data, or misuse client information." },
  { h: "4. Billing", p: "Paid plans are billed at a flat monthly rate per shop, with no per-booking fees. You can upgrade, downgrade, or cancel at any time; access continues through the current billing period." },
  { h: "5. Availability", p: "We work to keep the service reliable, but it is provided 'as is' without warranty. We aren't liable for indirect or incidental damages arising from use of the service." },
  { h: "6. Changes", p: "We may update these terms as the product evolves. Material changes will be communicated, and continued use constitutes acceptance." },
];

export default function TermsPage() {
  return (
    <div className="lux relative min-h-screen">
      <div className="lux-atmosphere" aria-hidden />
      <div className="lux-grain" aria-hidden />
      <div className="relative z-10 mx-auto max-w-3xl px-5 py-20">
        <Link href="/" className="text-sm text-brass hover:underline">← Back home</Link>
        <h1 className="mt-6 font-display text-4xl font-medium tracking-tight text-cream sm:text-5xl">Terms of Service</h1>
        <p className="mt-3 text-cream/50">Last updated {new Date().getFullYear()}.</p>
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
