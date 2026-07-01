import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { MarketingHeader } from "@/components/MarketingHeader";
import { MarketingFooter } from "@/components/MarketingFooter";
import { FEATURES, featureBySlug, TIER_META, type FeatureIcon } from "@/lib/featureContent";
import { ScissorsIcon, RazorIcon, CombIcon, PoleIcon } from "@/components/BarberIcons";
import {
  BrowserFrame, BookingScreen, DashboardScreen, ReportsPreview, AnalyticsPreview,
  GalleryScreen, ServicesScreen, CalendarScreen, ClientsScreen,
} from "@/components/marketing/Previews";

const ICONS: Record<FeatureIcon, typeof ScissorsIcon> = {
  scissors: ScissorsIcon, razor: RazorIcon, comb: CombIcon, pole: PoleIcon,
};

const RENDERS: Record<string, { url: string; node: React.ReactNode }> = {
  gallery: { url: "yourshop.thechair.app", node: <GalleryScreen /> },
  services: { url: "yourshop.thechair.app/services", node: <ServicesScreen /> },
  booking: { url: "yourshop.thechair.app/book", node: <BookingScreen /> },
  calendar: { url: "yourshop.thechair.app/book", node: <CalendarScreen /> },
  dashboard: { url: "yourshop.thechair.app/portal", node: <DashboardScreen /> },
  reports: { url: "yourshop.thechair.app/portal/reports", node: <ReportsPreview /> },
  clients: { url: "yourshop.thechair.app/portal/clients", node: <ClientsScreen /> },
  analytics: { url: "admin.thechair.app/analytics", node: <AnalyticsPreview /> },
};

export function generateStaticParams() {
  return FEATURES.map((f) => ({ slug: f.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const f = featureBySlug(slug);
  if (!f) return { title: "Feature" };
  return { title: f.title, description: f.blurb };
}

export default async function FeatureDetail({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const f = featureBySlug(slug);
  if (!f) notFound();
  const Icon = ICONS[f.icon];
  const tier = TIER_META[f.tier];
  const others = FEATURES.filter((x) => x.slug !== f.slug);

  return (
    <div className="min-h-screen">
      <MarketingHeader />
      <section className="container-page py-14">
        <Link href="/features" className="text-sm text-cream/50 hover:text-cream">← All features</Link>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <span className="grid h-12 w-12 place-items-center rounded-xl bg-barber/20 text-flame"><Icon size={24} /></span>
          <span className={`badge ${tier.badge}`}>{tier.label} plan & up</span>
        </div>
        <h1 className="mt-4 font-display text-4xl md:text-5xl">{f.emoji} {f.title}</h1>
        <p className="mt-3 max-w-2xl text-lg text-cream/75">{f.blurb}</p>
        {f.tierNote && <p className="mt-2 max-w-2xl text-sm text-cream/50">ℹ️ {f.tierNote}</p>}

        <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_300px]">
          <div className="space-y-4 text-cream/75">
            {f.intro.map((p, i) => <p key={i}>{p}</p>)}
            <ul className="space-y-2 pt-1">
              {f.bullets.map((b) => <li key={b} className="flex gap-2"><span className="text-brass">✓</span><span>{b}</span></li>)}
            </ul>
            <div className="pt-2">
              <Link href="/beta" className="btn-primary px-6 py-2.5">✨ Request beta access</Link>
            </div>
          </div>
          <aside className="card h-max">
            <div className="text-xs uppercase tracking-wide text-cream/40">Available on</div>
            <div className="mt-1 font-display text-2xl">{tier.label}</div>
            <p className="mt-1 text-sm text-cream/50">…and every plan above it.</p>
            <Link href="/pricing" className="btn-ghost mt-4 w-full">See plans &amp; pricing 💰</Link>
          </aside>
        </div>

        {/* Product renders (numerous images) */}
        <div className="mt-14">
          <div className="eyebrow">📸 A closer look</div>
          <h2 className="mt-2 font-display text-2xl">See {f.title.toLowerCase()} in action</h2>
        </div>
        <div className="mt-6 space-y-6">
          {f.renders.map((key) => {
            const r = RENDERS[key];
            return r ? <BrowserFrame key={key} url={r.url}>{r.node}</BrowserFrame> : null;
          })}
        </div>

        {/* Other features */}
        <h2 className="mt-16 font-display text-2xl">Explore more features</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {others.map((o) => (
            <Link key={o.slug} href={`/features/${o.slug}`} className="card card-hover block">
              <div className="font-medium">{o.emoji} {o.title}</div>
              <div className="mt-1 text-xs text-cream/50">{o.blurb}</div>
            </Link>
          ))}
        </div>
      </section>
      <MarketingFooter />
    </div>
  );
}
