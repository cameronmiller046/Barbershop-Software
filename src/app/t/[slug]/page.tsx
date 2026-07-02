import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TenantShell } from "@/components/TenantShell";
import { QrCode } from "@/components/QrCode";
import { Reveal } from "@/components/Reveal";
import { prisma } from "@/lib/prisma";
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

// Small gold eyebrow + heading used to open each section.
function SectionHead({ eyebrow, title, brand, center }: { eyebrow: string; title: string; brand: string; center?: boolean }) {
  return (
    <div className={center ? "text-center" : ""}>
      <div className="text-xs font-semibold uppercase tracking-[0.25em]" style={{ color: brand }}>{eyebrow}</div>
      <h2 className="mt-2 font-display text-3xl md:text-4xl">{title}</h2>
      <div className={`mt-3 h-px w-16 ${center ? "mx-auto" : ""}`} style={{ background: brand }} />
    </div>
  );
}

export default async function TenantHome({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const tenant = await getTenantBySlug(slug);
  if (!tenant) notFound();

  const [services, reviews, team] = await Promise.all([
    getTenantServices(tenant.id),
    getTenantReviews(tenant.id),
    prisma.user.findMany({
      where: { tenantId: tenant.id, role: { in: ["OWNER", "BARBER"] }, active: true },
      select: { id: true, name: true, avatarUrl: true, bio: true, instagramHandle: true },
      orderBy: [{ role: "asc" }, { createdAt: "asc" }],
      take: 8,
    }),
  ]);
  const base = `/t/${tenant.slug}`;
  const bookUrl = appUrl(`${base}/book`);
  const brand = tenant.primaryColor;
  const onBrand = readableOn(brand);
  const heroImg = tenant.heroImageUrl || HERO_IMG;
  const serviceShots = services.filter((s) => s.imageUrl).slice(0, 6).map((s) => ({ src: s.imageUrl as string, alt: s.name }));
  const gallery = serviceShots.length >= 3 ? serviceShots : GALLERY;
  const mapsDir = tenant.address ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(tenant.address)}` : null;

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
      "@type": "Offer", itemOffered: { "@type": "Service", name: s.name },
      price: (s.priceCents / 100).toFixed(2), priceCurrency: "USD",
    })),
  };

  const goldBtn = { background: brand, color: onBrand };
  const benefits = [
    { icon: "✂️", title: "Master barbers", body: "Skilled pros who take pride in every fade, cut, and line-up." },
    { icon: "🧴", title: "Premium products", body: "Top-shelf pomades, oils, and a proper hot-towel finish." },
    { icon: "📱", title: "Book in 60 seconds", body: "Pick a barber, service, and time online — no phone tag." },
    { icon: "🚶", title: "Walk-ins welcome", body: "In the neighborhood? Pull up — we'll take care of you." },
  ];

  return (
    <TenantShell tenant={tenant} active="home">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {/* ───────── Cinematic hero ───────── */}
      <section className="relative flex min-h-[88vh] items-center overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={heroImg} alt={`Fresh haircuts and fades at ${tenant.name}`} className="absolute inset-0 h-full w-full object-cover animate-kenburns" style={{ objectPosition: tenant.heroImagePosition }} />
        <div className="absolute inset-0" style={{ background: "linear-gradient(105deg, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.6) 45%, rgba(0,0,0,0.25) 100%)" }} />
        <div className="absolute inset-x-0 top-0 h-px" style={{ background: `linear-gradient(90deg, transparent, ${brand}, transparent)` }} />

        <div className="relative container-page grid w-full items-center gap-10 py-20 md:grid-cols-[1.4fr_1fr]">
          <div className="animate-fade-up">
            <div className="flex items-center gap-3 text-xs uppercase tracking-[0.3em]" style={{ color: brand }}>
              <span className="h-px w-8" style={{ background: brand }} /> {city(tenant.address) || "The cut you deserve"}
            </div>
            <h1 className="mt-5 font-display text-6xl leading-[0.95] md:text-8xl">
              Look sharp.<br /><span style={{ color: brand }}>Feel the part.</span>
            </h1>
            <p className="mt-6 max-w-lg text-lg text-cream/80">
              {tenant.tagline || "Precision fades, classic cuts, and beard work — in a shop that treats every chair like the main event."}
            </p>
            {tenant.googleRating != null && (
              <div className="mt-5 flex items-center gap-2 text-sm">
                <span className="text-lg" style={{ color: brand }}>{"★".repeat(Math.round(tenant.googleRating))}</span>
                <span className="text-cream/80">{tenant.googleRating.toFixed(1)} on Google · loved by locals</span>
              </div>
            )}
            <div className="mt-9 flex flex-wrap gap-3">
              <Link href={`${base}/book`} className="btn px-9 py-4 text-base font-semibold shadow-xl" style={goldBtn}>Book an appointment →</Link>
              {tenant.phone && <a href={`tel:${tenant.phone}`} className="btn-ghost px-7 py-4 text-base">📞 Call the shop</a>}
            </div>
          </div>

          {/* Booking card */}
          <div className="animate-fade-up justify-self-center" style={{ animationDelay: "160ms" }}>
            <div className="w-full max-w-xs rounded-2xl border bg-black/60 p-6 text-center shadow-2xl backdrop-blur" style={{ borderColor: `${brand}55` }}>
              <div className="text-xs font-semibold uppercase tracking-[0.25em]" style={{ color: brand }}>Scan to book</div>
              <div className="mt-4 flex justify-center rounded-xl bg-black/40 p-3">
                <QrCode value={bookUrl} size={172} dark="#0f0f10" light="#f5f1e8" />
              </div>
              <Link href={`${base}/book`} className="btn mt-4 block w-full py-3 font-semibold" style={goldBtn}>Book online now</Link>
              <p className="mt-3 text-xs text-cream/50">Fast, free, and no account needed.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ───────── Trust bar ───────── */}
      <section className="border-y border-white/10 bg-black/40">
        <div className="container-page grid grid-cols-2 gap-6 py-7 text-center md:grid-cols-4">
          {[
            { big: tenant.googleRating != null ? `${tenant.googleRating.toFixed(1)}★` : "5★", small: "Google rated" },
            { big: `${team.length || 2}`, small: "Master barbers" },
            { big: `${services.length}+`, small: "Services offered" },
            { big: "60s", small: "To book online" },
          ].map((s) => (
            <div key={s.small}>
              <div className="font-display text-3xl" style={{ color: brand }}>{s.big}</div>
              <div className="mt-1 text-xs uppercase tracking-wider text-cream/50">{s.small}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ───────── Why us ───────── */}
      <section className="container-page py-16">
        <SectionHead eyebrow="The experience" title="Why book with us" brand={brand} center />
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {benefits.map((b, i) => (
            <Reveal key={b.title} delay={i * 70} className="flex">
              <div className="card card-hover w-full text-center">
                <div className="mx-auto grid h-14 w-14 place-items-center rounded-full text-2xl" style={{ background: `${brand}1f` }}>{b.icon}</div>
                <h3 className="mt-4 font-display text-xl">{b.title}</h3>
                <p className="mt-2 text-sm text-cream/60">{b.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ───────── Services ───────── */}
      <section id="services" className="container-page py-10">
        <div className="flex items-end justify-between">
          <SectionHead eyebrow="The menu" title="Services & prices" brand={brand} />
          <Link href={`${base}/services`} className="btn-ghost hidden sm:inline-flex">Full menu →</Link>
        </div>
        {services.length === 0 ? (
          <div className="card mt-8 text-cream/60">Services coming soon.</div>
        ) : (
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {services.slice(0, 6).map((s, i) => (
              <Reveal key={s.id} delay={i * 60} className="flex">
                <div className="card card-hover flex w-full flex-col">
                  <div className="flex items-baseline justify-between gap-3">
                    <h3 className="font-display text-xl">{s.name}</h3>
                    <span className="font-display text-lg" style={{ color: brand }}>{formatMoney(s.priceCents)}</span>
                  </div>
                  {s.description && <p className="mt-1 text-sm text-cream/60">{s.description}</p>}
                  <div className="mt-3 flex gap-2 text-xs">
                    <span className="chip">{formatDuration(s.durationMin)}</span>
                    {s.barber && <span className="chip">with {s.barber.name}</span>}
                  </div>
                  <Link href={`${base}/book?service=${s.id}`} className="mt-5 rounded-full py-2.5 text-center text-sm font-semibold" style={goldBtn}>Book this</Link>
                </div>
              </Reveal>
            ))}
          </div>
        )}
      </section>

      {/* ───────── Team ───────── */}
      {team.length > 0 && (
        <section className="container-page py-16">
          <SectionHead eyebrow="The team" title="Meet your barbers" brand={brand} center />
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {team.map((b, i) => (
              <Reveal key={b.id} delay={i * 70} className="flex">
                <div className="card card-hover flex w-full flex-col items-center text-center">
                  {b.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={b.avatarUrl} alt={b.name} className="h-24 w-24 rounded-full object-cover ring-2" style={{ "--tw-ring-color": brand } as React.CSSProperties} />
                  ) : (
                    <div className="grid h-24 w-24 place-items-center rounded-full font-display text-3xl" style={{ background: `${brand}22`, color: brand }}>{b.name.charAt(0)}</div>
                  )}
                  <h3 className="mt-4 font-display text-xl">{b.name}</h3>
                  {b.bio && <p className="mt-1 line-clamp-2 text-sm text-cream/60">{b.bio}</p>}
                  <Link href={`${base}/book?barber=${b.id}`} className="mt-4 text-sm font-semibold" style={{ color: brand }}>Book with {b.name.split(" ")[0]} →</Link>
                </div>
              </Reveal>
            ))}
          </div>
        </section>
      )}

      {/* ───────── Gallery ───────── */}
      <section className="container-page py-10">
        <SectionHead eyebrow="Our work" title="Fresh cuts, every day" brand={brand} />
        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {gallery.map((g, i) => (
            <Reveal key={g.src} delay={i * 60}>
              <div className="group relative aspect-[4/5] overflow-hidden rounded-xl border border-white/10">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={g.src} alt={g.alt} loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-110" />
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ───────── Testimonials ───────── */}
      {reviews.length > 0 && (
        <section className="container-page py-16">
          <SectionHead eyebrow="Reviews" title="What clients say" brand={brand} center />
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {reviews.slice(0, 3).map((r, i) => (
              <Reveal key={r.id} delay={i * 90} className="flex">
                <div className="card card-hover flex w-full flex-col">
                  <div className="text-lg" style={{ color: brand }}>{"★".repeat(r.rating)}</div>
                  <p className="mt-3 flex-1 text-sm leading-relaxed text-cream/80">“{r.body}”</p>
                  <p className="mt-4 text-xs uppercase tracking-wider text-cream/50">— {r.authorName}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </section>
      )}

      {/* ───────── Location ───────── */}
      {tenant.address && (
        <section className="container-page py-10">
          <Reveal>
            <div className="grid items-center gap-6 rounded-3xl border border-white/10 bg-charcoal/60 p-8 md:grid-cols-2">
              <div>
                <SectionHead eyebrow="Visit us" title="Find the shop" brand={brand} />
                <p className="mt-4 text-cream/75">{tenant.address}</p>
                {tenant.phone && <p className="mt-1"><a href={`tel:${tenant.phone}`} style={{ color: brand }}>{tenant.phone}</a></p>}
                <div className="mt-6 flex flex-wrap gap-3">
                  <Link href={`${base}/book`} className="btn px-6 py-3 font-semibold" style={goldBtn}>Book a chair</Link>
                  {mapsDir && <a href={mapsDir} target="_blank" rel="noreferrer" className="btn-ghost px-6 py-3">Get directions →</a>}
                </div>
              </div>
              {mapsDir && (
                <a href={mapsDir} target="_blank" rel="noreferrer" className="relative block overflow-hidden rounded-2xl border border-white/10">
                  <iframe title="Map" src={`https://maps.google.com/maps?q=${encodeURIComponent(tenant.address)}&z=15&output=embed`} loading="lazy" className="pointer-events-none h-56 w-full border-0" />
                  <span className="absolute inset-0" aria-hidden />
                </a>
              )}
            </div>
          </Reveal>
        </section>
      )}

      {/* ───────── Final CTA ───────── */}
      <section className="container-page py-16 pb-28 sm:pb-16">
        <Reveal>
          <div className="relative overflow-hidden rounded-3xl border p-12 text-center" style={{ borderColor: `${brand}44`, background: `radial-gradient(120% 120% at 50% 0%, ${brand}22, transparent 60%)` }}>
            <div className="text-xs font-semibold uppercase tracking-[0.3em]" style={{ color: brand }}>Your chair is waiting</div>
            <h2 className="mt-3 font-display text-4xl md:text-5xl">Ready for a fresh cut?</h2>
            <p className="mx-auto mt-3 max-w-md text-cream/70">Pick your barber, service, and time — it takes under a minute.</p>
            <Link href={`${base}/book`} className="btn mt-7 px-10 py-4 text-base font-semibold shadow-xl" style={goldBtn}>Book now →</Link>
          </div>
        </Reveal>
      </section>

      {/* Sticky mobile book bar */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-black/90 p-3 backdrop-blur sm:hidden">
        <Link href={`${base}/book`} className="btn block w-full py-3 text-center font-semibold" style={goldBtn}>Book an appointment →</Link>
      </div>
    </TenantShell>
  );
}
