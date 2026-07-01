import Link from "next/link";
import { MarketingHeader } from "@/components/MarketingHeader";
import { MarketingFooter } from "@/components/MarketingFooter";
import { BrowserFrame, DashboardScreen, AnalyticsPreview } from "@/components/marketing/Previews";

export const metadata = {
  title: "About",
  description: "The Chair gives barbershops a professional website, online booking, and a portal to run the shop — one platform, unlimited shops.",
};

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

      <section className="container-page space-y-14 pb-16">
        <div className="grid items-center gap-8 md:grid-cols-2">
          <div>
            <div className="eyebrow">Runs the day</div>
            <h2 className="mt-2 font-display text-3xl">One portal for the whole shop</h2>
            <p className="mt-3 text-cream/70">
              Barbers see their chair; managers see the floor. Appointments,
              clients, and schedules in one clean dashboard.
            </p>
          </div>
          <BrowserFrame url="yourshop.thechair.app/portal"><DashboardScreen /></BrowserFrame>
        </div>
        <div className="grid items-center gap-8 md:grid-cols-2">
          <div className="md:order-2">
            <div className="eyebrow">Privacy-first</div>
            <h2 className="mt-2 font-display text-3xl">Analytics without the tracking</h2>
            <p className="mt-3 text-cream/70">
              A cookieless, anonymous analytics dashboard for the whole platform —
              no IPs, no customer data, just the trends the team needs.
            </p>
          </div>
          <div className="md:order-1"><BrowserFrame url="admin.thechair.app/analytics"><AnalyticsPreview /></BrowserFrame></div>
        </div>
      </section>
      <MarketingFooter />
    </div>
  );
}
