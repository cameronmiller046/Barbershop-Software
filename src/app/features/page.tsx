import Link from "next/link";
import { MarketingHeader } from "@/components/MarketingHeader";
import { MarketingFooter } from "@/components/MarketingFooter";
import { ScissorsIcon, RazorIcon, CombIcon, PoleIcon } from "@/components/BarberIcons";
import { BrowserFrame, BookingScreen, DashboardScreen, ReportsPreview, AnalyticsPreview } from "@/components/marketing/Previews";

export const metadata = {
  title: "Features",
  description: "Everything a barbershop needs: branded website, online booking + QR, chair-side portal, owner reports, and privacy-first analytics.",
};

const GROUPS = [
  {
    Icon: ScissorsIcon,
    title: "Branded shop website",
    items: ["Home, Services, FAQ, Contact + photo gallery", "Custom brand colors and logo", "Printable QR code that links to booking", "Responsive on desktop, tablet, and mobile"],
  },
  {
    Icon: RazorIcon,
    title: "Booking engine",
    items: ["Schedule, reschedule, and cancel", "Pick barber and service", "Per-barber availability windows", "Email confirmations", "Self-serve manage link for customers"],
  },
  {
    Icon: CombIcon,
    title: "Chair-side portal & owner reports",
    items: ["Daily dashboard and upcoming appointments", "Client list with private notes", "Service management and pricing", "CRM-style reports: monthly goal, pace & trend", "Per-barber earnings breakdown"],
  },
  {
    Icon: PoleIcon,
    title: "Platform, analytics & security",
    items: ["Consent-based, privacy-first analytics (no PII)", "Full tenant isolation & role-based access", "Audit logs for sensitive actions", "Rate limiting and input validation", "One codebase, unlimited shops"],
  },
];

export default function FeaturesPage() {
  return (
    <div className="min-h-screen">
      <MarketingHeader />
      <section className="container-page py-16">
        <h1 className="font-display text-4xl md:text-5xl">Features</h1>
        <p className="mt-3 max-w-xl text-cream/70">
          Everything you need to run an appointment-based business — and a platform
          built to grow with you.
        </p>
        <div className="mt-10 grid gap-5 md:grid-cols-2">
          {GROUPS.map((g) => (
            <div key={g.title} className="card">
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-barber/20 text-flame"><g.Icon size={20} /></span>
                <h2 className="font-display text-2xl text-brass">{g.title}</h2>
              </div>
              <ul className="mt-4 space-y-2 text-sm text-cream/75">
                {g.items.map((it) => (
                  <li key={it} className="flex gap-2">
                    <span className="text-brass">✓</span>
                    <span>{it}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        {/* Product renders */}
        <div className="mt-16">
          <div className="eyebrow">👀 See it in action</div>
          <h2 className="mt-2 font-display text-3xl">What the features look like</h2>
        </div>
        <div className="mt-8 grid gap-6 md:grid-cols-2">
          <div>
            <BrowserFrame url="yourshop.thechair.app/book"><BookingScreen /></BrowserFrame>
            <p className="mt-2 text-sm text-cream/60">💈 Customer booking page — pick a barber, service, and time.</p>
          </div>
          <div>
            <BrowserFrame url="yourshop.thechair.app/portal"><DashboardScreen /></BrowserFrame>
            <p className="mt-2 text-sm text-cream/60">✂️ Chair-side portal — today&apos;s schedule at a glance.</p>
          </div>
          <div>
            <BrowserFrame url="yourshop.thechair.app/portal/reports"><ReportsPreview /></BrowserFrame>
            <p className="mt-2 text-sm text-cream/60">📈 Owner reports — sales goal, pace, and 12-month trend.</p>
          </div>
          <div>
            <BrowserFrame url="admin.thechair.app/analytics"><AnalyticsPreview /></BrowserFrame>
            <p className="mt-2 text-sm text-cream/60">📊 Analytics — visitors, sources, and top shops.</p>
          </div>
        </div>

        <div className="mt-12">
          <Link href="/beta" className="btn-primary px-7 py-3 text-base">✨ Request beta access</Link>
        </div>
      </section>
      <MarketingFooter />
    </div>
  );
}
