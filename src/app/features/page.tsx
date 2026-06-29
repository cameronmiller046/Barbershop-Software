import Link from "next/link";
import { MarketingHeader } from "@/components/MarketingHeader";
import { MarketingFooter } from "@/components/MarketingFooter";

export const metadata = { title: "Features — The Chair" };

const GROUPS = [
  {
    title: "Branded tenant website",
    items: ["Home, Services, Reviews, FAQ, Contact", "Custom brand color and logo", "Printable QR code that links to booking", "Responsive on desktop, tablet, and mobile"],
  },
  {
    title: "Booking engine",
    items: ["Schedule, reschedule, and cancel", "Pick barber and service", "Per-barber availability windows", "Email confirmations", "Self-serve manage link for customers"],
  },
  {
    title: "Barber portal",
    items: ["Daily dashboard and upcoming appointments", "Client list with private notes", "Service management and pricing", "Analytics on bookings and revenue", "Social media content planner"],
  },
  {
    title: "Platform & security",
    items: ["Full tenant isolation", "Role-based access control", "Audit logs for sensitive actions", "Rate limiting and input validation", "One codebase, unlimited shops"],
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
              <h2 className="font-display text-2xl text-brass">{g.title}</h2>
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
        <div className="mt-10">
          <Link href="/beta" className="btn-primary px-7 py-3 text-base">Request beta access</Link>
        </div>
      </section>
      <MarketingFooter />
    </div>
  );
}
