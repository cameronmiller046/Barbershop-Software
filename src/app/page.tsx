import Link from "next/link";
import { MarketingHeader } from "@/components/MarketingHeader";
import { MarketingFooter } from "@/components/MarketingFooter";

export const metadata = { title: "The Chair — Barbershop software" };

const FEATURES = [
  { title: "Branded shop website", body: "Every shop gets its own site — services, team, gallery, reviews, and a booking page." },
  { title: "Online booking + QR", body: "Customers book, reschedule, and cancel themselves. Print a QR code for the front desk." },
  { title: "Barber portal", body: "Dashboards, appointments, clients, notes, analytics, and social planning in one place." },
  { title: "Multi-location ready", body: "One platform, many shops. Each tenant's data is fully isolated and secure." },
];

export default function Home() {
  return (
    <div className="min-h-screen">
      <MarketingHeader />

      <section className="container-page grid items-center gap-10 py-20 md:grid-cols-2">
        <div>
          <span className="chip">Now in closed beta</span>
          <h1 className="mt-4 font-display text-5xl leading-tight md:text-6xl">
            Booking software built for <span className="text-brass">barbershops.</span>
          </h1>
          <p className="mt-5 max-w-md text-cream/70">
            Give every shop a beautiful website, effortless online booking, and a
            portal that runs the business — all on one platform.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/beta" className="btn-primary px-7 py-3 text-base">Request beta access</Link>
            <Link href="/t/professional-barbershop" className="btn-ghost px-7 py-3 text-base">
              View live demo
            </Link>
          </div>
          <p className="mt-4 text-xs text-cream/40">No credit card · Manual onboarding during beta</p>
        </div>

        <div className="card">
          <div className="rounded-xl border border-white/10 bg-ink/60 p-4">
            <div className="flex items-center gap-2 text-xs text-cream/40">
              <span className="h-2.5 w-2.5 rounded-full bg-red-400/70" />
              <span className="h-2.5 w-2.5 rounded-full bg-yellow-400/70" />
              <span className="h-2.5 w-2.5 rounded-full bg-green-400/70" />
              <span className="ml-2">professionalbarbershop.thechair.app</span>
            </div>
            <div className="mt-4 space-y-3">
              <div className="h-28 rounded-lg bg-gradient-to-br from-brass/30 to-smoke" />
              <div className="grid grid-cols-3 gap-2">
                <div className="h-16 rounded-lg bg-smoke" />
                <div className="h-16 rounded-lg bg-smoke" />
                <div className="h-16 rounded-lg bg-smoke" />
              </div>
              <div className="h-9 w-2/3 rounded-full bg-brass/80" />
            </div>
          </div>
          <p className="mt-3 text-center text-xs text-cream/40">
            Every tenant runs on this same codebase.
          </p>
        </div>
      </section>

      <section className="container-page py-10">
        <h2 className="font-display text-3xl">Everything a shop needs</h2>
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f) => (
            <div key={f.title} className="card">
              <h3 className="font-display text-xl text-brass">{f.title}</h3>
              <p className="mt-2 text-sm text-cream/70">{f.body}</p>
            </div>
          ))}
        </div>
        <div className="mt-8">
          <Link href="/features" className="btn-ghost">See all features →</Link>
        </div>
      </section>

      <section className="container-page py-16">
        <div className="card flex flex-col items-center gap-4 bg-gradient-to-br from-brass/10 to-transparent text-center">
          <h2 className="font-display text-3xl">Ready to modernize your shop?</h2>
          <p className="max-w-md text-cream/70">
            We&apos;re onboarding a handful of shops each week during beta.
          </p>
          <Link href="/beta" className="btn-primary px-7 py-3 text-base">Request beta access</Link>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}
