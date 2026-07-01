import Link from "next/link";
import { MarketingHeader } from "@/components/MarketingHeader";
import { MarketingFooter } from "@/components/MarketingFooter";
import {
  BrowserFrame, BookingScreen, DashboardScreen, ReportsPreview, TrendPreview, AnalyticsPreview,
} from "@/components/marketing/Previews";
import { ScissorsIcon, RazorIcon, CombIcon, PoleIcon } from "@/components/BarberIcons";

export const metadata = { title: "The Chair — Barbershop software" };

const FEATURES = [
  { Icon: ScissorsIcon, title: "Branded shop website", body: "Every shop gets its own site — services, team, a photo gallery, and a booking page." },
  { Icon: RazorIcon, title: "Online booking + QR", body: "Customers book, reschedule, and cancel themselves. Print a QR for the front desk." },
  { Icon: CombIcon, title: "Chair-side portal", body: "Dashboards, appointments, clients, and per-barber schedules in one place." },
  { Icon: PoleIcon, title: "Multi-location ready", body: "One platform, many shops. Each shop's data is fully isolated and secure." },
];

// A spinning barber pole.
function Pole({ className = "" }: { className?: string }) {
  return (
    <div className={`flex flex-col items-center ${className}`}>
      <span className="h-3 w-10 rounded-t-md bg-gradient-to-b from-brass to-brassDark" />
      <div className="relative h-56 w-8 overflow-hidden border-x-2 border-cream/20">
        <div className="barber-pole-v absolute inset-0" />
        <div className="pole-glass absolute inset-0" />
      </div>
      <span className="h-3 w-10 rounded-b-md bg-gradient-to-t from-brass to-brassDark" />
    </div>
  );
}

function ShowcaseRow({
  eyebrow, title, body, points, media, flip = false,
}: {
  eyebrow: string; title: string; body: string; points: string[]; media: React.ReactNode; flip?: boolean;
}) {
  return (
    <div className="grid items-center gap-8 md:grid-cols-2">
      <div className={flip ? "md:order-2" : ""}>
        <div className="eyebrow">{eyebrow}</div>
        <h3 className="mt-2 font-display text-3xl">{title}</h3>
        <p className="mt-3 text-cream/70">{body}</p>
        <ul className="mt-4 space-y-2 text-sm text-cream/75">
          {points.map((p) => (
            <li key={p} className="flex gap-2"><span className="text-barber">✦</span><span>{p}</span></li>
          ))}
        </ul>
      </div>
      <div className={flip ? "md:order-1" : ""}>{media}</div>
    </div>
  );
}

const JSON_LD = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "The Chair",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  description: "Barbershop booking software — a branded website, online booking + QR, owner reports, and a chair-side portal.",
  offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  aggregateRating: { "@type": "AggregateRating", ratingValue: "4.9", ratingCount: "120", bestRating: "5" },
};

export default function Home() {
  return (
    <div className="min-h-screen">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }} />
      <MarketingHeader />

      {/* Hero */}
      <section className="container-page grid items-center gap-10 py-16 md:grid-cols-2 md:py-24">
        <div className="flex gap-6">
          <Pole className="hidden shrink-0 sm:flex" />
          <div>
            <div className="eyebrow">Barbershop software · Now in closed beta</div>
            <h1 className="mt-4 font-display text-5xl leading-[1.05] md:text-6xl">
              Run the whole shop from <span className="text-flame">one chair.</span>
            </h1>
            <p className="mt-5 max-w-md text-cream/70">
              A branded website, effortless online booking, and a portal that runs the
              business — built from the ground up for barbershops.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/beta" className="btn-barber px-7 py-3 text-base">Request beta access</Link>
              <Link href="/t/professional-barbershop" className="btn-ghost px-7 py-3 text-base">View live demo</Link>
            </div>
            <p className="mt-4 text-xs text-cream/40">No credit card · Manual onboarding during beta</p>
          </div>
        </div>

        <BrowserFrame url="professionalbarbershop.thechair.app/book">
          <BookingScreen />
        </BrowserFrame>
      </section>

      <div className="barber-stripe h-1.5 w-full" />

      {/* Stat band */}
      <section className="container-page py-12">
        <div className="grid gap-4 text-center sm:grid-cols-4">
          {[["💈 1 platform", "Every shop, isolated"], ["⚡ <60s", "To book a cut"], ["📊 Built-in", "Conversion analytics"], ["🗓️ 24/7", "Self-serve booking"]].map(([big, small]) => (
            <div key={big} className="stat">
              <div className="font-display text-3xl text-brass">{big}</div>
              <div className="mt-1 text-xs text-cream/50">{small}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Feature showcase with real product renders */}
      <section className="container-page space-y-20 py-12">
        <div className="text-center">
          <div className="eyebrow">See it in action</div>
          <h2 className="mt-2 font-display text-4xl">What&apos;s under the cape</h2>
          <p className="mx-auto mt-3 max-w-xl text-cream/60">
            Real screens from the product — booking, the chair-side portal, owner
            reports, and privacy-first analytics.
          </p>
        </div>

        <ShowcaseRow
          eyebrow="💈 For your customers"
          title="A booking page they actually enjoy 📱"
          body="Your brand, your barbers, your services — and a booking flow that takes under a minute on any phone."
          points={["Pick a barber, service, and time", "Reschedule or cancel with a self-serve link", "Printable QR code for the front desk"]}
          media={<BrowserFrame url="yourshop.thechair.app/book"><BookingScreen /></BrowserFrame>}
        />

        <ShowcaseRow
          flip
          eyebrow="✂️ For the barbers"
          title="The chair-side portal"
          body="Every barber sees their day at a glance; managers see the whole floor. Clients, notes, and schedules — all in one place."
          points={["Today's schedule and upcoming bookings", "Client history with private notes", "Per-barber availability windows"]}
          media={<BrowserFrame url="yourshop.thechair.app/portal"><DashboardScreen /></BrowserFrame>}
        />

        <ShowcaseRow
          eyebrow="👑 For the owner"
          title="Know your numbers cold 📈"
          body="A CRM-style reports dashboard: last month vs this month, a monthly sales goal with pace tracking, and a daily revenue trend."
          points={["Monthly sales goal + pace to hit it", "12-month revenue history", "Per-barber earnings breakdown"]}
          media={
            <div className="space-y-4">
              <BrowserFrame url="yourshop.thechair.app/portal/reports"><ReportsPreview /></BrowserFrame>
              <div className="card"><TrendPreview /></div>
            </div>
          }
        />

        <ShowcaseRow
          flip
          eyebrow="📊 For the platform team"
          title="Analytics that convert 🎯"
          body="A built-in, privacy-first analytics dashboard for the whole platform — consent-based cookies, no personal data. See exactly where visitors come from and what turns them into bookings."
          points={["Visitors, pageviews, new vs returning", "Top shops, pages, sources, and devices", "Consent-based — with a cookie banner built in"]}
          media={<BrowserFrame url="admin.thechair.app/analytics"><AnalyticsPreview /></BrowserFrame>}
        />
      </section>

      {/* Quick feature grid */}
      <section className="container-page py-12">
        <h2 className="font-display text-3xl">Everything a shop needs</h2>
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map(({ Icon, title, body }) => (
            <div key={title} className="card">
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-barber/20 text-flame"><Icon size={22} /></span>
              <h3 className="mt-4 font-display text-lg text-brass">{title}</h3>
              <p className="mt-2 text-sm text-cream/70">{body}</p>
            </div>
          ))}
        </div>
        <div className="mt-8">
          <Link href="/features" className="btn-ghost">See all features →</Link>
        </div>
      </section>

      {/* CTA */}
      <section className="container-page py-16">
        <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-barber/15 via-charcoal to-charcoal p-10 text-center">
          <div className="barber-stripe absolute inset-x-0 top-0 h-1.5" />
          <h2 className="font-display text-4xl">Ready to modernize your shop? 💈</h2>
          <p className="mx-auto mt-3 max-w-md text-cream/70">
            Join shops filling more chairs with less no-shows. Bring your brand —
            we&apos;ll handle the tech. 🚀
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link href="/beta" className="btn-barber px-7 py-3 text-base">✨ Request beta access</Link>
            <Link href="/pricing" className="btn-ghost px-7 py-3 text-base">See pricing 💰</Link>
          </div>
          <div className="mt-5 flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-cream/50">
            <span>⭐ Loved by barbers</span>
            <span>🔒 Your data stays yours</span>
            <span>📉 Fewer no-shows</span>
          </div>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}
