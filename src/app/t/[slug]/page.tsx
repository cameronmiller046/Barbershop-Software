import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTenantBySlug, getTenantServices, getTenantBarbers, getTenantReviews } from "@/lib/tenant";
import { formatMoney, formatDuration, appUrl } from "@/lib/utils";
import { Reveal, Counter } from "@/components/home/motion";
import { LuxHeading } from "@/components/home/LuxBits";
import { Icon } from "@/components/home/icons";
import { QrCode } from "@/components/QrCode";
import { QMARK } from "@/lib/placeholder";

export const dynamic = "force-dynamic";

const EMB = [8, 22, 36, 50, 64, 78, 90];
const city = (a?: string | null) => { if (!a) return ""; const p = a.split(",").map((s) => s.trim()); return p.length >= 2 ? p[1] : p[0]; };

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const tenant = await getTenantBySlug(slug);
  if (!tenant) return { title: "Shop not found" };
  const where = city(tenant.address);
  const title = tenant.metaTitle?.trim() || `${tenant.name} — Barbershop${where ? ` in ${where}` : ""} | Book Online`;
  const description = tenant.metaDescription?.trim() || `${tenant.tagline || `Sharp cuts, skin fades, and beard trims at ${tenant.name}.`} Book your appointment online in under a minute.${tenant.address ? ` Visit us at ${tenant.address}.` : ""}`;
  const url = appUrl(`/t/${tenant.slug}`);
  const img = tenant.coverImageUrl || tenant.heroImageUrl || undefined;
  return {
    title, description,
    keywords: ["barber", "barbershop", "haircut", "skin fade", "beard trim", "men's haircut", where, tenant.name].filter(Boolean) as string[],
    alternates: { canonical: url },
    icons: tenant.faviconUrl ? { icon: tenant.faviconUrl } : undefined,
    openGraph: { title, description, url, siteName: tenant.name, type: "website", images: img ? [{ url: img, width: 1600, height: 1000, alt: `${tenant.name} barbershop` }] : undefined },
    twitter: { card: "summary_large_image", title, description, images: img ? [img] : undefined },
    robots: { index: !tenant.isDemo, follow: true },
  };
}

export default async function ShopHome({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const tenant = await getTenantBySlug(slug);
  if (!tenant) notFound();

  const [services, barbers, reviews] = await Promise.all([
    getTenantServices(tenant.id),
    getTenantBarbers(tenant.id),
    getTenantReviews(tenant.id),
  ]);

  const base = `/t/${tenant.slug}`;
  const bookHref = `${base}/book`;
  const rating = tenant.googleRating ?? null;
  const reviewCount = reviews.length || 128;
  const heroImg = tenant.heroImageUrl || QMARK;
  const heroTitle = tenant.heroHeadline?.trim();
  const heroSub = tenant.heroSubheading?.trim() || tenant.tagline || "Precision fades, classic cuts, and beard work — in a shop that treats every chair like the main event.";
  const cta = { background: "var(--brand)", color: "var(--brand-fg)" } as React.CSSProperties;
  const featured = services.slice(0, 6);
  const showBarbers = tenant.showBarbers && barbers.length > 0;
  const showReviews = tenant.showReviews && reviews.length > 0;

  const jsonLd = {
    "@context": "https://schema.org", "@type": "HairSalon",
    name: tenant.name, description: tenant.description || tenant.tagline || `Barbershop — ${tenant.name}`,
    url: appUrl(base), telephone: tenant.phone || undefined, email: tenant.email || undefined,
    image: tenant.coverImageUrl || tenant.heroImageUrl || undefined, priceRange: "$$",
    address: tenant.address ? { "@type": "PostalAddress", streetAddress: tenant.address } : undefined,
    aggregateRating: rating != null ? { "@type": "AggregateRating", ratingValue: rating, reviewCount, bestRating: 5 } : undefined,
    sameAs: [tenant.instagramUrl, tenant.facebookUrl, tenant.tiktokUrl, tenant.website].filter(Boolean),
    makesOffer: services.slice(0, 12).map((s) => ({ "@type": "Offer", price: (s.priceCents / 100).toFixed(2), priceCurrency: "USD", itemOffered: { "@type": "Service", name: s.name } })),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {/* ── Hero ── */}
      <section className="relative flex min-h-[92vh] items-center overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={heroImg} alt={`Inside ${tenant.name} barbershop`} className="absolute inset-0 h-full w-full object-cover" style={{ objectPosition: tenant.heroImagePosition }} />
        <div className="absolute inset-0 bg-[linear-gradient(105deg,rgba(6,6,8,0.94)_0%,rgba(6,6,8,0.7)_45%,rgba(6,6,8,0.35)_100%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(120%_100%_at_50%_100%,rgba(0,0,0,0.6),transparent_60%)]" />
        <div className="lux-embers pointer-events-none absolute inset-0" aria-hidden>
          {EMB.map((l, i) => <span key={i} className="lux-ember" style={{ left: `${l}%`, width: 3, height: 3, animationDuration: `${13 + i * 2}s`, animationDelay: `${i * 2}s` }} />)}
        </div>

        <div className="relative mx-auto grid w-full max-w-7xl items-center gap-10 px-5 py-24 lg:grid-cols-[1.35fr_1fr]">
          <Reveal>
            {tenant.announcement && (
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-brass/30 bg-brass/10 px-3.5 py-1.5 text-sm text-brass"><span>📣</span> {tenant.announcement}</div>
            )}
            <div className="flex items-center gap-3 text-xs uppercase tracking-[0.3em] text-brass"><span className="h-px w-8 bg-brass" /> {city(tenant.address) || "Premium barbershop"}</div>
            {heroTitle ? (
              <h1 className="mt-5 font-display text-5xl font-medium leading-[0.98] tracking-tight text-cream sm:text-6xl xl:text-7xl">{heroTitle}</h1>
            ) : (
              <h1 className="mt-5 font-display text-6xl font-medium leading-[0.95] tracking-tight text-cream sm:text-7xl xl:text-8xl">Look Sharp.<br /><span className="gold-text">Feel the Part.</span></h1>
            )}
            <p className="mt-6 max-w-lg text-lg text-cream/75">{heroSub}</p>
            {rating != null && (
              <div className="mt-5 flex items-center gap-2 text-sm text-cream/80">
                <span className="flex text-brass">{Array.from({ length: 5 }).map((_, i) => <Icon.star key={i} className={`h-4 w-4 ${i < Math.round(rating) ? "" : "opacity-25"}`} />)}</span>
                <span>{rating.toFixed(1)} · {reviewCount.toLocaleString()} reviews</span>
              </div>
            )}
            <div className="mt-9 flex flex-wrap gap-3">
              <Link href={bookHref} className="inline-flex items-center gap-2 rounded-full px-8 py-4 text-base font-semibold shadow-xl transition hover:brightness-105" style={cta}>Book Appointment <Icon.arrow className="h-4 w-4" /></Link>
              {tenant.phone && <a href={`tel:${tenant.phone}`} className="btn-outline-gold text-base">Call Now</a>}
            </div>
          </Reveal>

          <Reveal delay={0.15} className="justify-self-center">
            <div className="glass w-full max-w-xs rounded-3xl p-6 text-center">
              <div className="text-xs font-semibold uppercase tracking-[0.25em] text-brass">Book in 60 seconds</div>
              <div className="mx-auto mt-4 w-max rounded-2xl bg-black/40 p-3"><QrCode value={appUrl(bookHref)} size={150} dark="#0f0f10" light="#f5f1e8" /></div>
              <p className="mt-3 text-xs text-cream/50">Scan to book on your phone</p>
              <Link href={bookHref} className="mt-4 block rounded-full py-3 text-sm font-semibold shadow-lg transition hover:brightness-105" style={cta}>Book online now</Link>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── Trust stats ── */}
      <section className="relative z-10 border-y border-white/10 bg-black/40">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-6 px-5 py-9 text-center md:grid-cols-4">
          {[
            { v: <><Counter to={rating ?? 5} decimals={1} />★</>, l: "Google Rating" },
            { v: <Counter to={barbers.length || 2} />, l: "Master Barbers" },
            { v: <><Counter to={services.length} />+</>, l: "Services Offered" },
            { v: <>60s</>, l: "Avg. Booking Time" },
          ].map((s, i) => (
            <Reveal key={i} delay={i * 0.06}>
              <div className="font-display text-3xl font-bold text-brass sm:text-4xl">{s.v}</div>
              <div className="mt-1 text-[11px] uppercase tracking-wider text-cream/50 sm:text-xs">{s.l}</div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── Featured services preview ── */}
      <section className="relative z-10 mx-auto max-w-7xl px-5 py-24">
        <LuxHeading eyebrow="The Menu" title={<>Popular <span className="gold-text">services</span></>} sub="A taste of what we offer — see the full menu with prices and times." />
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {featured.map((s) => (
            <Reveal key={s.id}>
              <div className="group flex h-full flex-col overflow-hidden rounded-2xl border border-white/8 bg-white/[0.02] transition hover:border-brass/40">
                <div className="aspect-[16/10] overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={s.imageUrl || QMARK} alt={s.name} loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
                </div>
                <div className="flex flex-1 flex-col p-5">
                  <div className="flex items-baseline justify-between gap-3"><h3 className="font-display text-lg text-cream">{s.name}</h3><span className="font-display text-lg text-brass">{formatMoney(s.priceCents)}</span></div>
                  {s.description && <p className="mt-1.5 line-clamp-2 flex-1 text-sm text-cream/55">{s.description}</p>}
                  <div className="mt-3 text-xs text-cream/45">{formatDuration(s.durationMin)}</div>
                  <Link href={`${bookHref}?service=${s.id}`} className="mt-4 rounded-full py-2.5 text-center text-sm font-semibold shadow-lg transition hover:brightness-105" style={cta}>Book Now</Link>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
        <Reveal className="mt-8 text-center"><Link href={`${base}/services`} className="btn-outline-gold">View full menu →</Link></Reveal>
      </section>

      {/* ── Barbers preview ── */}
      {showBarbers && (
        <section className="relative z-10 mx-auto max-w-7xl px-5 py-16">
          <LuxHeading eyebrow="The Team" title={<>Meet your <span className="gold-text">barbers</span></>} />
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {barbers.slice(0, 4).map((b) => (
              <Reveal key={b.id}>
                <div className="lux-card flex h-full flex-col items-center p-6 text-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={b.avatarUrl || QMARK} alt={b.name} loading="lazy" className="h-24 w-24 rounded-full object-cover ring-2 ring-brass/40" />
                  <h3 className="mt-4 font-display text-xl text-cream">{b.name}</h3>
                  {b.bio && <p className="mt-1.5 line-clamp-2 text-sm text-cream/55">{b.bio}</p>}
                </div>
              </Reveal>
            ))}
          </div>
          <Reveal className="mt-8 text-center"><Link href={`${base}/barbers`} className="btn-outline-gold">Meet the whole team →</Link></Reveal>
        </section>
      )}

      {/* ── Reviews preview ── */}
      {showReviews && (
        <section className="relative z-10 mx-auto max-w-6xl px-5 py-16">
          <LuxHeading eyebrow="Reviews" title={<>Loved by <span className="gold-text">locals</span></>} />
          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {reviews.slice(0, 3).map((r) => (
              <Reveal key={r.id}>
                <figure className="lux-card flex h-full flex-col p-7">
                  <div className="flex gap-1 text-brass">{Array.from({ length: 5 }).map((_, i) => <Icon.star key={i} className={`h-4 w-4 ${i < r.rating ? "" : "opacity-25"}`} />)}</div>
                  <blockquote className="mt-4 flex-1 text-[15px] leading-relaxed text-cream/80">“{r.body}”</blockquote>
                  <figcaption className="mt-6 text-sm font-semibold text-cream">{r.authorName}</figcaption>
                </figure>
              </Reveal>
            ))}
          </div>
          <Reveal className="mt-8 text-center"><Link href={`${base}/reviews`} className="btn-outline-gold">Read all reviews →</Link></Reveal>
        </section>
      )}

      {/* ── Final CTA ── */}
      <section className="relative z-10 mx-auto max-w-6xl px-5 py-20">
        <Reveal>
          <div className="relative overflow-hidden rounded-[2.5rem] border border-brass/20 px-6 py-16 text-center sm:px-16">
            <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_50%_0%,rgba(216,178,92,0.2),transparent_60%)]" />
            <h2 className="mx-auto max-w-2xl font-display text-4xl font-medium tracking-tight text-cream sm:text-5xl">Ready for a <span className="gold-text">fresh cut?</span></h2>
            <p className="mx-auto mt-4 max-w-xl text-lg text-cream/60">Pick your barber, service, and time — it takes under a minute.</p>
            <Link href={bookHref} className="mt-8 inline-flex items-center gap-2 rounded-full px-8 py-4 text-base font-semibold shadow-xl transition hover:brightness-105" style={cta}>Book Appointment <Icon.arrow className="h-4 w-4" /></Link>
          </div>
        </Reveal>
      </section>
    </>
  );
}
