import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TenantShell } from "@/components/TenantShell";
import { QrCode } from "@/components/QrCode";
import { Reveal } from "@/components/Reveal";
import { getTenantBySlug, getTenantServices, getTenantReviews } from "@/lib/tenant";
import { formatMoney, formatDuration, appUrl, readableOn } from "@/lib/utils";

export const dynamic = "force-dynamic";

// Haircut photography for the hero + gallery. `lock` keeps each image stable.
const HERO_IMG = "https://loremflickr.com/1600/900/barbershop,haircut/all?lock=42";
const GALLERY = [
  { src: "https://loremflickr.com/600/750/barber,fade/all?lock=11", alt: "Skin fade haircut" },
  { src: "https://loremflickr.com/600/750/haircut,men/all?lock=12", alt: "Men's haircut and style" },
  { src: "https://loremflickr.com/600/750/beard,barber/all?lock=13", alt: "Beard trim and lineup" },
  { src: "https://loremflickr.com/600/750/barbershop,shave/all?lock=14", alt: "Hot towel shave" },
  { src: "https://loremflickr.com/600/750/haircut,fade/all?lock=15", alt: "Fresh fade" },
  { src: "https://loremflickr.com/600/750/barber,hairstyle/all?lock=16", alt: "Classic barber cut" },
];

function city(address?: string | null) {
  if (!address) return "";
  const parts = address.split(",").map((p) => p.trim());
  return parts.length >= 2 ? parts[1] : parts[0];
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const tenant = await getTenantBySlug(slug);
  if (!tenant) return { title: "Shop not found" };

  const where = city(tenant.address);
  const title = `${tenant.name} — Barbershop${where ? ` in ${where}` : ""} | Book Online`;
  const description =
    `${tenant.tagline || `Sharp cuts, skin fades, and beard trims at ${tenant.name}.`} ` +
    `Book your haircut online in under a minute.${tenant.address ? ` Visit us at ${tenant.address}.` : ""}`;
  const url = appUrl(`/t/${tenant.slug}`);

  return {
    title,
    description,
    keywords: ["barber", "barbershop", "haircut", "skin fade", "beard trim", "men's haircut", "hot towel shave", where, tenant.name].filter(Boolean) as string[],
    alternates: { canonical: url },
    openGraph: { title, description, url, siteName: tenant.name, type: "website", images: [{ url: HERO_IMG, width: 1600, height: 900, alt: `${tenant.name} barbershop` }] },
    twitter: { card: "summary_large_image", title, description, images: [HERO_IMG] },
    robots: { index: true, follow: true },
  };
}

export default async function TenantHome({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const tenant = await getTenantBySlug(slug);
  if (!tenant) notFound();

  const [services, reviews] = await Promise.all([
    getTenantServices(tenant.id),
    getTenantReviews(tenant.id),
  ]);
  const base = `/t/${tenant.slug}`;
  const bookUrl = appUrl(`${base}/book`);
  const brand = tenant.primaryColor;
  const heroImg = tenant.heroImageUrl || HERO_IMG;
  // Gallery uses the shop's own service photos (admin-managed); falls back to
  // stock haircut shots until the admin uploads their own.
  const serviceShots = services.filter((s) => s.imageUrl).slice(0, 6).map((s) => ({ src: s.imageUrl as string, alt: s.name }));
  const gallery = serviceShots.length >= 3 ? serviceShots : GALLERY;

  // Local-business structured data — strong signal for local search / rich results.
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "HairSalon",
    name: tenant.name,
    description: tenant.tagline || `Barbershop — ${tenant.name}`,
    url: appUrl(base),
    telephone: tenant.phone || undefined,
    email: tenant.email || undefined,
    image: HERO_IMG,
    priceRange: "$$",
    address: tenant.address ? { "@type": "PostalAddress", streetAddress: tenant.address } : undefined,
    aggregateRating: tenant.googleRating != null
      ? { "@type": "AggregateRating", ratingValue: tenant.googleRating, ratingCount: 50, bestRating: 5 }
      : undefined,
    makesOffer: services.slice(0, 8).map((s) => ({
      "@type": "Offer",
      itemOffered: { "@type": "Service", name: s.name },
      price: (s.priceCents / 100).toFixed(2),
      priceCurrency: "USD",
    })),
  };

  return (
    <TenantShell tenant={tenant} active="home">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {/* ───────── Fancy hero ───────── */}
      <section className="relative overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={heroImg} alt={`Fresh haircuts and fades at ${tenant.name}`} className="absolute inset-0 h-full w-full object-cover animate-kenburns" style={{ objectPosition: tenant.heroImagePosition }} />
        <div
          className="absolute inset-0"
          style={{ background: `linear-gradient(100deg, rgba(0,0,0,0.86) 0%, rgba(0,0,0,0.55) 46%, rgba(0,0,0,0.22) 100%)` }}
        />

        <div className="relative container-page grid items-center gap-10 py-20 md:grid-cols-[1.3fr_1fr] md:py-28">
          <div className="animate-fade-up">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-black/30 px-3 py-1 text-xs text-cream/80 backdrop-blur">
              <span className="h-2 w-2 rounded-full" style={{ background: brand }} />
              {tenant.address || "Walk-ins welcome"}
            </span>
            <h1 className="mt-5 font-display text-5xl leading-[1.02] md:text-7xl">
              Look sharp.<br /><span style={{ color: brand }}>Book in seconds.</span>
            </h1>
            {tenant.googleRating != null && (
              <div className="mt-4 flex items-center gap-2 text-sm">
                <span style={{ color: brand }}>{"★".repeat(Math.round(tenant.googleRating))}</span>
                <span className="text-cream/80">{tenant.googleRating.toFixed(1)} on Google · trusted by locals</span>
              </div>
            )}
            <p className="mt-4 max-w-md text-lg text-cream/75">
              {tenant.tagline || "Skin fades, classic cuts, and beard work by pros who care."}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href={`${base}/book`} className="btn px-8 py-3.5 text-base font-semibold" style={{ background: brand, color: readableOn(brand) }}>
                Book an appointment →
              </Link>
              <Link href={`${base}/services`} className="btn-ghost px-7 py-3.5 text-base">View services &amp; prices</Link>
            </div>
            <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm text-cream/60">
              <span>✂️ Expert barbers</span>
              <span>⏱️ Under-a-minute booking</span>
              <span>📅 Reschedule anytime</span>
            </div>
          </div>

          {/* Booking card */}
          <div className="animate-fade-up justify-self-center" style={{ animationDelay: "160ms" }}>
            <div className="card flex flex-col items-center gap-4 border-white/15 bg-charcoal/90 text-center shadow-2xl shadow-black/40">
              <span className="font-display text-xl" style={{ color: brand }}>Scan to book</span>
              <QrCode value={bookUrl} size={190} dark="#0f0f10" light="#f5f1e8" />
              <Link href={`${base}/book`} className="btn-primary w-full">Book online now</Link>
              <p className="max-w-[15rem] text-xs text-cream/50">Fast, free, and no account needed.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ───────── Haircut gallery ───────── */}
      <section className="container-page py-14">
        <div className="mb-6 flex items-end justify-between">
          <div>
            <div className="eyebrow" style={{ color: brand }}>Our work</div>
            <h2 className="mt-1 font-display text-3xl">Fresh cuts, every day</h2>
          </div>
          <Link href={`${base}/book`} className="btn-ghost hidden sm:inline-flex">Book yours</Link>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {gallery.map((g, i) => (
            <Reveal key={g.src} delay={i * 70}>
              <div className="group relative aspect-[4/5] overflow-hidden rounded-xl border border-white/10">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={g.src} alt={g.alt} loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-110" />
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ───────── Services ───────── */}
      <section id="services" className="container-page py-10">
        <div className="mb-6 flex items-end justify-between">
          <h2 className="font-display text-3xl">Popular services</h2>
          <Link href={`${base}/services`} className="btn-ghost hidden sm:inline-flex">All services</Link>
        </div>
        {services.length === 0 ? (
          <div className="card text-cream/60">Services coming soon.</div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {services.slice(0, 6).map((s, i) => (
              <Reveal key={s.id} delay={i * 70} className="flex">
                <div className="card card-hover flex w-full flex-col">
                  <div className="flex items-baseline justify-between">
                    <h3 className="font-display text-xl">{s.name}</h3>
                    <span style={{ color: brand }}>{formatMoney(s.priceCents)}</span>
                  </div>
                  {s.description && <p className="mt-1 text-sm text-cream/60">{s.description}</p>}
                  <div className="mt-3 flex gap-2 text-xs">
                    <span className="chip">{formatDuration(s.durationMin)}</span>
                    {s.barber && <span className="chip">with {s.barber.name}</span>}
                  </div>
                  <Link href={`${base}/book?service=${s.id}`} className="btn-primary mt-5">Book this</Link>
                </div>
              </Reveal>
            ))}
          </div>
        )}
      </section>

      {/* ───────── Social proof ───────── */}
      {reviews.length > 0 && (
        <section className="container-page py-10">
          <h2 className="font-display text-3xl">What clients say</h2>
          <div className="mt-6 grid gap-5 md:grid-cols-3">
            {reviews.slice(0, 3).map((r, i) => (
              <Reveal key={r.id} delay={i * 90} className="flex">
                <div className="card card-hover w-full">
                  <div style={{ color: brand }}>{"★".repeat(r.rating)}</div>
                  <p className="mt-2 text-sm text-cream/75">“{r.body}”</p>
                  <p className="mt-3 text-xs text-cream/50">— {r.authorName}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </section>
      )}

      {/* ───────── Final CTA ───────── */}
      <section className="container-page py-14">
        <Reveal>
          <div className="relative overflow-hidden rounded-3xl border border-white/10 p-10 text-center" style={{ background: `linear-gradient(135deg, ${brand}1f, transparent)` }}>
            <h2 className="font-display text-4xl">Ready for a fresh cut?</h2>
            <p className="mx-auto mt-2 max-w-md text-cream/70">Pick your barber, service, and time — it takes under a minute.</p>
            <Link href={`${base}/book`} className="btn mt-6 px-8 py-3.5 text-base font-semibold" style={{ background: brand, color: readableOn(brand) }}>
              Book now
            </Link>
          </div>
        </Reveal>
      </section>
    </TenantShell>
  );
}
