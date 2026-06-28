import Link from "next/link";
import { MarketingHeader } from "@/components/MarketingHeader";
import { MarketingFooter } from "@/components/MarketingFooter";

export const metadata = { title: "About — The Chair" };

export default function AboutPage() {
  return (
    <div className="min-h-screen">
      <MarketingHeader />
      <section className="container-page max-w-3xl py-16">
        <h1 className="font-display text-4xl md:text-5xl">About The Chair</h1>
        <div className="mt-6 space-y-4 text-cream/75">
          <p>
            The Chair is a multi-tenant platform that gives appointment-based
            businesses a professional online presence and the tools to run day to
            day — starting with barbershops.
          </p>
          <p>
            One codebase powers every shop. When a business is approved, we
            provision a branded website and a secure portal automatically, with the
            shop&apos;s own services, team, and bookings kept fully isolated from
            everyone else&apos;s.
          </p>
          <p>
            Our core concepts — services, staff, appointments, and customers — are
            intentionally generic, so the same platform can grow to support salons,
            spas, tattoo studios, pet groomers, and more.
          </p>
        </div>
        <div className="mt-8 flex gap-3">
          <Link href="/beta" className="btn-primary">Request beta access</Link>
          <Link href="/contact" className="btn-ghost">Contact us</Link>
        </div>
      </section>
      <MarketingFooter />
    </div>
  );
}
