import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { MarketingHeader } from "@/components/MarketingHeader";
import { MarketingFooter } from "@/components/MarketingFooter";
import { Reveal } from "@/components/Reveal";
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
  return { title: f.title, description: f.blurb, alternates: { canonical: `/features/${f.slug}` } };
}

export default async function FeatureDetail({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const f = featureBySlug(slug);
  if (!f) notFound();
  const Icon = ICONS[f.icon];
  const tier = TIER_META[f.tier];
  const idx = FEATURES.findIndex((x) => x.slug === f.slug);
  const next = FEATURES[(idx + 1) % FEATURES.length];
  const NextIcon = ICONS[next.icon];

  const words = f.title.split(" ");
  const last = words.pop() ?? "";
  const rest = words.join(" ");

  return (
    <div className="relative min-h-screen overflow-x-hidden mkt">
      <MarketingHeader />

      {/* Intro */}
      <section className="container-page pb-6 pt-14">
        <Link href="/features" className="mb-10 inline-flex items-center gap-1.5 text-sm text-cream/50 transition-colors hover:text-cream">
          ← All features
        </Link>
        <div className="mx-auto max-w-3xl text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-flame/30 bg-flame/5 px-3 py-1 text-xs font-medium text-flame">
            <Icon size={14} /> {f.emoji} {f.tag}
          </span>
          <h1 className="mt-4 font-display text-4xl leading-[1.05] md:text-6xl">
            {rest} <span className="text-shimmer">{last}</span>
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-cream/70">{f.blurb}</p>
          <div className="mt-5 flex items-center justify-center gap-2">
            <span className={`badge ${tier.badge}`}>{tier.label} plan &amp; up</span>
          </div>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {f.bullets.map((b) => (
              <span key={b} className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-charcoal px-3 py-1 text-xs text-cream/70">
                <span className="text-brass">✓</span> {b}
              </span>
            ))}
          </div>
          {f.tierNote && <p className="mx-auto mt-4 max-w-xl text-sm text-cream/50">ℹ️ {f.tierNote}</p>}
        </div>
      </section>

      {/* Alternating render + explanation rows */}
      <section className="container-page space-y-24 py-14 md:space-y-32">
        {f.renders.map((key, i) => {
          const r = RENDERS[key];
          const sec = f.sections[i];
          const reverse = i % 2 === 1;
          return (
            <div key={key} className="grid grid-cols-1 items-center gap-10 md:grid-cols-2">
              <Reveal className={`min-w-0 ${reverse ? "md:order-2" : ""}`}>
                <div>
                  <span className="eyebrow">{f.title}</span>
                  <h2 className="mt-2 font-display text-2xl md:text-3xl">{sec?.title ?? f.title}</h2>
                  <p className="mt-3 text-cream/70">{sec?.body ?? f.blurb}</p>
                </div>
              </Reveal>
              <Reveal delay={80} className={`min-w-0 ${reverse ? "md:order-1" : ""}`}>
                {r && <BrowserFrame url={r.url}>{r.node}</BrowserFrame>}
              </Reveal>
            </div>
          );
        })}
      </section>

      {/* CTA */}
      <section className="container-page py-14">
        <div className="relative mx-auto max-w-4xl overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-barber/15 via-charcoal to-charcoal p-10 text-center">
          <div className="barber-stripe absolute inset-x-0 top-0 h-1.5" />
          <h2 className="font-display text-3xl">Run your whole shop from one chair 💈</h2>
          <p className="mx-auto mt-3 max-w-xl text-cream/70">Flat monthly price, no per-booking fees. Bring your brand — we&apos;ll handle the tech.</p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link href="/signup" className="btn-barber px-7 py-3 text-base">✨ Get started free</Link>
            <Link href="/pricing" className="btn-ghost px-7 py-3 text-base">See pricing 💰</Link>
          </div>
        </div>
      </section>

      {/* Next feature */}
      <section className="container-page pb-16">
        <Link href={`/features/${next.slug}`} className="group mx-auto flex max-w-4xl items-center justify-between gap-4 rounded-2xl border border-white/10 bg-charcoal p-5 transition-colors hover:border-flame/40">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-barber/20 text-flame"><NextIcon size={20} /></span>
            <div>
              <p className="text-xs text-cream/50">Next feature</p>
              <p className="font-semibold">{next.emoji} {next.title}</p>
            </div>
          </div>
          <span className="text-cream/50 transition-transform group-hover:translate-x-1 group-hover:text-flame">→</span>
        </Link>
      </section>

      <MarketingFooter />
    </div>
  );
}
