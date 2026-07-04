import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getTenantBySlug, getTenantServices, getTenantBarbers, getTenantGallery, getTenantReviews } from "@/lib/tenant";
import { appUrl, readableOn, hexToRgbTriple } from "@/lib/utils";
import { QMARK } from "@/lib/placeholder";
import { Reveal, Stagger, Item, Counter } from "@/components/home/motion";
import { LuxHeading } from "@/components/home/LuxBits";
import { Icon } from "@/components/home/icons";
import { Faq, type Qa } from "@/components/pricing/Faq";
import { QrCode } from "@/components/QrCode";
import { BookingWizard } from "@/components/BookingWizard";
import { ShopNav, type NavSection } from "@/components/shop/ShopNav";
import { ShopServices } from "@/components/shop/ShopServices";
import { ShopGallery, type Shot } from "@/components/shop/ShopGallery";
import { ReviewsCarousel } from "@/components/shop/ReviewsCarousel";

export const dynamic = "force-dynamic";

// No stock photography — a shop shows neutral "?" placeholders until it uploads
// its own hero + gallery images from the portal.
const STOCK: Shot[] = Array.from({ length: 6 }, () => ({ src: QMARK, alt: "Photo coming soon" }));
const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const fmtMin = (m: number) => { const h = Math.floor(m / 60), mm = m % 60; const ap = h < 12 ? "AM" : "PM"; const hr = ((h + 11) % 12) + 1; return `${hr}:${String(mm).padStart(2, "0")} ${ap}`; };
const city = (a?: string | null) => { if (!a) return ""; const p = a.split(",").map((s) => s.trim()); return p.length >= 2 ? p[1] : p[0]; };

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const tenant = await getTenantBySlug(slug);
  if (!tenant) return { title: "Shop not found" };
  const where = city(tenant.address);
  const title = tenant.metaTitle?.trim() || `${tenant.name} — Barbershop${where ? ` in ${where}` : ""} | Book Online`;
  const description = tenant.metaDescription?.trim() || `${tenant.tagline || `Sharp cuts, skin fades, and beard trims at ${tenant.name}.`} Book your appointment online in under a minute.${tenant.address ? ` Visit us at ${tenant.address}.` : ""}`;
  const url = appUrl(`/t/${tenant.slug}`);
  const img = tenant.coverImageUrl || tenant.heroImageUrl || undefined; // owner's cover/hero, no stock
  return {
    title, description,
    keywords: ["barber", "barbershop", "haircut", "skin fade", "beard trim", "men's haircut", "hot towel shave", where, tenant.name].filter(Boolean) as string[],
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

  const [services, barbers, gallery, reviews, hours] = await Promise.all([
    getTenantServices(tenant.id),
    getTenantBarbers(tenant.id),
    getTenantGallery(tenant.id),
    getTenantReviews(tenant.id),
    prisma.workingHour.findMany({ where: { tenantId: tenant.id }, select: { dayOfWeek: true, startMin: true, endMin: true } }),
  ]);

  const base = `/t/${tenant.slug}`;
  const brand = tenant.primaryColor;
  const onBrand = readableOn(brand);
  const heroImg = tenant.heroImageUrl || QMARK;
  const rating = tenant.googleRating ?? null;
  const reviewCount = reviews.length || 128;

  // Aggregate shop hours across barbers.
  const byDay = new Map<number, { open: number; close: number }>();
  for (const w of hours) { const c = byDay.get(w.dayOfWeek); byDay.set(w.dayOfWeek, { open: Math.min(c?.open ?? 1e9, w.startMin), close: Math.max(c?.close ?? -1e9, w.endMin) }); }
  const hoursRows = [1, 2, 3, 4, 5, 6, 0].map((d) => ({ day: DAYS[d], range: byDay.has(d) ? `${fmtMin(byDay.get(d)!.open)} – ${fmtMin(byDay.get(d)!.close)}` : "Closed" }));

  // Gallery: shop photos + service photos + stock fallback.
  const shots: Shot[] = [
    ...gallery.map((g) => ({ src: g.imageUrl, alt: g.caption || `${tenant.name} barbershop` })),
    ...services.filter((s) => s.imageUrl).map((s) => ({ src: s.imageUrl as string, alt: `${s.name} at ${tenant.name}` })),
  ];
  if (shots.length < 6) shots.push(...STOCK.slice(0, 6 - shots.length));
  const galleryShots = shots.slice(0, 12);

  const svcForWizard = services.map((s) => ({ id: s.id, name: s.name, description: s.description, durationMin: s.durationMin, priceCents: s.priceCents, barberId: s.barberId, barberName: s.barber?.name ?? null }));

  const showBarbers = tenant.showBarbers && barbers.length > 0;
  const showReviews = tenant.showReviews && reviews.length > 0;
  const nav: NavSection[] = [
    ...(tenant.description ? [{ id: "about", label: "About" }] : []),
    { id: "services", label: "Services" },
    ...(showBarbers ? [{ id: "barbers", label: "Barbers" }] : []),
    ...(tenant.showGallery ? [{ id: "gallery", label: "Gallery" }] : []),
    ...(showReviews ? [{ id: "reviews", label: "Reviews" }] : []),
    ...(tenant.showFaq ? [{ id: "faq", label: "FAQ" }] : []),
    { id: "contact", label: "Contact" },
  ];
  const heroTitle = tenant.heroHeadline?.trim();
  const heroSub = tenant.heroSubheading?.trim() || tenant.tagline || "Precision fades, classic cuts, and beard work — in a shop that treats every chair like the main event.";
  const bookLabel = tenant.heroCtaText?.trim() || "Book Appointment";
  const socials = [
    tenant.instagramUrl ? { href: tenant.instagramUrl, label: "Instagram" } : null,
    tenant.facebookUrl ? { href: tenant.facebookUrl, label: "Facebook" } : null,
    tenant.tiktokUrl ? { href: tenant.tiktokUrl, label: "TikTok" } : null,
  ].filter(Boolean) as { href: string; label: string }[];

  const FAQ: Qa[][] = [
    [
      { q: "Do you accept walk-ins?", a: "Yes — walk-ins are always welcome. For your preferred barber and time, booking online is the fastest way in." },
      { q: "What's your cancellation policy?", a: "Life happens. Just cancel or reschedule from your confirmation link, ideally at least a couple of hours ahead." },
      { q: "How long does an appointment take?", a: "Most cuts run 30–45 minutes; combos and premium services a bit longer. Each service shows its time when you book." },
      { q: "What payment methods do you accept?", a: "We take card and cash in-shop, and tips are always appreciated." },
      { q: "Is there parking?", a: "Street and nearby lot parking are available. Use \"Get directions\" for turn-by-turn navigation." },
    ],
    [
      { q: "Are kids welcome?", a: "Absolutely — we cut for all ages and offer kids' cuts. Bring the whole crew." },
      { q: "Do you sell gift cards?", a: "Yes. Gift cards make a perfect gift — ask at the front desk or mention it when you visit." },
      { q: "Do you offer memberships?", a: "We offer memberships for regulars who want the best value on their monthly cut. Ask your barber for details." },
      { q: "Is the shop accessible?", a: "Our space is designed to be comfortable and accessible for everyone. Let us know if you need anything." },
      { q: "Can I request a specific barber?", a: "Of course. Choose your barber when booking, or pick \"next available\" to be seen sooner." },
    ],
  ];

  const jsonLd = {
    "@context": "https://schema.org", "@type": "HairSalon",
    name: tenant.name, description: tenant.description || tenant.tagline || `Barbershop — ${tenant.name}`,
    url: appUrl(base), telephone: tenant.phone || undefined, email: tenant.email || undefined,
    image: tenant.coverImageUrl || tenant.heroImageUrl || undefined, priceRange: "$$",
    sameAs: [tenant.instagramUrl, tenant.facebookUrl, tenant.tiktokUrl, tenant.website].filter(Boolean),
    address: tenant.address ? { "@type": "PostalAddress", streetAddress: tenant.address } : undefined,
    openingHoursSpecification: [...byDay.entries()].map(([d, h]) => ({ "@type": "OpeningHoursSpecification", dayOfWeek: `https://schema.org/${DAYS[d]}`, opens: `${String(Math.floor(h.open / 60)).padStart(2, "0")}:${String(h.open % 60).padStart(2, "0")}`, closes: `${String(Math.floor(h.close / 60)).padStart(2, "0")}:${String(h.close % 60).padStart(2, "0")}` })),
    aggregateRating: rating != null ? { "@type": "AggregateRating", ratingValue: rating, reviewCount, bestRating: 5 } : undefined,
    makesOffer: services.slice(0, 12).map((s) => ({ "@type": "Offer", price: (s.priceCents / 100).toFixed(2), priceCurrency: "USD", itemOffered: { "@type": "Service", name: s.name } })),
    review: reviews.slice(0, 6).map((r) => ({ "@type": "Review", reviewRating: { "@type": "Rating", ratingValue: r.rating, bestRating: 5 }, author: { "@type": "Person", name: r.authorName }, reviewBody: r.body })),
  };
  const faqLd = { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: FAQ.flat().map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) };
  const mapsDir = tenant.address ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(tenant.address)}` : null;

  const cta = { background: brand, color: onBrand } as React.CSSProperties;

  return (
    <div className="lux relative min-h-screen" style={{ "--brand": brand, "--brand-fg": onBrand, "--brass": hexToRgbTriple(tenant.secondaryColor || brand) } as React.CSSProperties}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />
      <div className="lux-grain" aria-hidden />

      <ShopNav shopName={tenant.name} logoUrl={tenant.logoUrl} sections={nav} />

      {/* ── Hero ── */}
      <section id="home" className="relative flex min-h-[92vh] items-center overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={heroImg} alt={`Inside ${tenant.name} barbershop`} className="absolute inset-0 h-full w-full object-cover" style={{ objectPosition: tenant.heroImagePosition }} />
        <div className="absolute inset-0 bg-[linear-gradient(105deg,rgba(6,6,8,0.94)_0%,rgba(6,6,8,0.7)_45%,rgba(6,6,8,0.35)_100%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(120%_100%_at_50%_100%,rgba(0,0,0,0.6),transparent_60%)]" />
        <div className="lux-embers pointer-events-none absolute inset-0" aria-hidden>
          {STOCK.map((_, i) => <span key={i} className="lux-ember" style={{ left: `${8 + i * 15}%`, width: 3, height: 3, animationDuration: `${13 + i * 2}s`, animationDelay: `${i * 2}s` }} />)}
        </div>

        <div className="relative mx-auto grid w-full max-w-7xl items-center gap-10 px-5 py-24 lg:grid-cols-[1.35fr_1fr]">
          <Reveal>
            {tenant.announcement && (
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-brass/30 bg-brass/10 px-3.5 py-1.5 text-sm text-brass">
                <span>📣</span> {tenant.announcement}
              </div>
            )}
            <div className="flex items-center gap-3 text-xs uppercase tracking-[0.3em] text-brass">
              <span className="h-px w-8 bg-brass" /> {city(tenant.address) || "Premium barbershop"}
            </div>
            {heroTitle ? (
              <h1 className="mt-5 font-display text-5xl font-medium leading-[0.98] tracking-tight text-cream sm:text-6xl xl:text-7xl">{heroTitle}</h1>
            ) : (
              <h1 className="mt-5 font-display text-6xl font-medium leading-[0.95] tracking-tight text-cream sm:text-7xl xl:text-8xl">
                Look Sharp.<br /><span className="gold-text">Feel the Part.</span>
              </h1>
            )}
            <p className="mt-6 max-w-lg text-lg text-cream/75">
              {heroSub}
            </p>
            {rating != null && (
              <div className="mt-5 flex items-center gap-2 text-sm text-cream/80">
                <span className="flex text-brass">{Array.from({ length: 5 }).map((_, i) => <Icon.star key={i} className={`h-4 w-4 ${i < Math.round(rating) ? "" : "opacity-25"}`} />)}</span>
                <span>{rating.toFixed(1)} · {reviewCount.toLocaleString()} reviews</span>
              </div>
            )}
            <div className="mt-9 flex flex-wrap gap-3">
              <a href="#book" className="inline-flex items-center gap-2 rounded-full px-8 py-4 text-base font-semibold shadow-xl transition hover:brightness-105" style={cta}>{bookLabel} <Icon.arrow className="h-4 w-4" /></a>
              {tenant.phone && <a href={`tel:${tenant.phone}`} className="btn-outline-gold text-base">Call Now</a>}
            </div>
          </Reveal>

          {/* Floating booking widget */}
          <Reveal delay={0.15} className="justify-self-center">
            <div className="glass w-full max-w-xs rounded-3xl p-6 text-center">
              <div className="text-xs font-semibold uppercase tracking-[0.25em] text-brass">Book in 60 seconds</div>
              <div className="mx-auto mt-4 w-max rounded-2xl bg-black/40 p-3">
                <QrCode value={appUrl(`${base}/book`)} size={150} dark="#0f0f10" light="#f5f1e8" />
              </div>
              <p className="mt-3 text-xs text-cream/50">Scan to book on your phone</p>
              <a href="#book" className="mt-4 block rounded-full py-3 text-sm font-semibold shadow-lg transition hover:brightness-105" style={cta}>Book online now</a>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── Trust stats ── */}
      <section className="relative z-10 border-y border-white/10 bg-black/40">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-6 px-5 py-9 text-center md:grid-cols-4">
          {[
            { v: <Counter to={rating ?? 5} decimals={1} />, l: "Google Rating", star: true },
            { v: <Counter to={barbers.length || 2} />, l: "Master Barbers" },
            { v: <><Counter to={services.length} />+</>, l: "Services Offered" },
            { v: <>60s</>, l: "Avg. Booking Time" },
          ].map((s, i) => (
            <Reveal key={i} delay={i * 0.06}>
              <div className="font-display text-3xl font-bold text-brass sm:text-4xl">{s.v}{s.star ? "★" : ""}</div>
              <div className="mt-1 text-[11px] uppercase tracking-wider text-cream/50 sm:text-xs">{s.l}</div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── About ── */}
      {tenant.description && (
        <section id="about" className="relative z-10 mx-auto max-w-4xl scroll-mt-24 px-5 py-20 text-center">
          <LuxHeading eyebrow="About Us" title={<>Welcome to <span className="gold-text">{tenant.name}</span></>} />
          <Reveal delay={0.05}>
            <p className="mx-auto mt-6 max-w-2xl whitespace-pre-line text-lg leading-relaxed text-cream/70">{tenant.description}</p>
          </Reveal>
        </section>
      )}

      {/* ── Services ── */}
      <section id="services" className="relative z-10 mx-auto max-w-7xl scroll-mt-24 px-5 py-24">
        <LuxHeading eyebrow="The Menu" title={<>Services &amp; <span className="gold-text">prices</span></>} sub="Every service, with real times and prices. Filter by what you're after." />
        {services.length === 0 ? (
          <div className="mt-10 rounded-2xl border border-white/10 bg-white/[0.02] p-8 text-center text-cream/50">Services coming soon.</div>
        ) : (
          <ShopServices services={services.map((s) => ({ id: s.id, name: s.name, description: s.description, durationMin: s.durationMin, priceCents: s.priceCents, imageUrl: s.imageUrl, barberName: s.barber?.name ?? null }))} />
        )}
      </section>

      {/* ── Barbers ── */}
      {showBarbers && (
        <section id="barbers" className="relative z-10 mx-auto max-w-7xl scroll-mt-24 px-5 py-16">
          <LuxHeading eyebrow="The Team" title={<>Meet your <span className="gold-text">barbers</span></>} sub="Skilled pros who take pride in every fade, cut, and line-up." />
          <Stagger className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4" gap={0.07}>
            {barbers.map((b) => (
              <Item key={b.id}>
                <div className="lux-card group flex h-full flex-col items-center p-6 text-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={b.avatarUrl || QMARK} alt={b.name} loading="lazy" className="h-24 w-24 rounded-full object-cover ring-2 ring-brass/40" />
                  <h3 className="mt-4 font-display text-xl text-cream">{b.name}</h3>
                  {b.bio && <p className="mt-1.5 line-clamp-3 flex-1 text-sm text-cream/55">{b.bio}</p>}
                  <div className="mt-4 flex items-center gap-3">
                    {b.instagramHandle && <a href={`https://instagram.com/${b.instagramHandle}`} target="_blank" rel="noreferrer" className="text-cream/40 transition hover:text-brass" aria-label={`${b.name} on Instagram`}><Icon.spark className="h-4 w-4" /></a>}
                    <a href="#book" className="text-sm font-semibold text-brass hover:underline">Book with {b.name.split(" ")[0]} →</a>
                  </div>
                </div>
              </Item>
            ))}
          </Stagger>
        </section>
      )}

      {/* ── Gallery ── */}
      {tenant.showGallery && (
        <section id="gallery" className="relative z-10 mx-auto max-w-7xl scroll-mt-24 px-5 py-16">
          <LuxHeading eyebrow="Our Work" title={<>Fresh cuts, <span className="gold-text">every day</span></>} sub="A look inside the shop and the work that walks out the door." />
          <ShopGallery shots={galleryShots} />
        </section>
      )}

      {/* ── Reviews ── */}
      {showReviews && (
        <section id="reviews" className="relative z-10 mx-auto max-w-6xl scroll-mt-24 px-5 py-20">
          <LuxHeading eyebrow="Reviews" title={<>Loved by <span className="gold-text">locals</span></>} />
          <ReviewsCarousel reviews={reviews.map((r) => ({ id: r.id, authorName: r.authorName, rating: r.rating, body: r.body }))} rating={rating} count={reviewCount} />
        </section>
      )}

      {/* ── FAQ ── */}
      {tenant.showFaq && (
        <section id="faq" className="relative z-10 mx-auto max-w-4xl scroll-mt-24 px-5 py-16">
          <LuxHeading eyebrow="Good to Know" title={<>Common <span className="gold-text">questions</span></>} />
          <div className="mt-10"><Faq columns={FAQ} gridClassName="grid gap-4 md:grid-cols-2" /></div>
        </section>
      )}

      {/* ── Contact ── */}
      <section id="contact" className="relative z-10 mx-auto max-w-7xl scroll-mt-24 px-5 py-20">
        <LuxHeading eyebrow="Visit Us" title={<>Find the <span className="gold-text">shop</span></>} />
        <div className="mt-12 grid gap-6 lg:grid-cols-[1fr_1.2fr]">
          <div className="space-y-4">
            {tenant.address && <InfoCard icon="store" title="Address" lines={[tenant.address]} action={mapsDir ? { label: "Get directions →", href: mapsDir } : undefined} />}
            {tenant.phone && <InfoCard icon="headset" title="Phone" lines={[tenant.phone]} action={{ label: "Call now", href: `tel:${tenant.phone}` }} />}
            {tenant.email && <InfoCard icon="messages" title="Email" lines={[tenant.email]} action={{ label: "Email us", href: `mailto:${tenant.email}` }} />}
            <div className="p-panel p-5">
              <div className="flex items-center gap-2.5"><span className="grid h-9 w-9 place-items-center rounded-xl border border-brass/25 bg-brass/[0.06] text-brass"><Icon.clock className="h-5 w-5" /></span><span className="text-sm font-semibold text-cream">Business Hours</span></div>
              <div className="mt-3 space-y-1.5">
                {hoursRows.map((h) => (
                  <div key={h.day} className="flex justify-between text-sm"><span className="text-cream/60">{h.day}</span><span className={h.range === "Closed" ? "text-cream/35" : "text-cream/85"}>{h.range}</span></div>
                ))}
              </div>
              <p className="mt-3 text-xs text-cream/40">Street &amp; nearby lot parking available.</p>
            </div>
          </div>
          <div className="overflow-hidden rounded-3xl border border-white/10">
            {tenant.address ? (
              <iframe title={`Map to ${tenant.name}`} src={`https://maps.google.com/maps?q=${encodeURIComponent(tenant.address)}&z=15&output=embed`} loading="lazy" className="h-full min-h-[420px] w-full border-0 grayscale-[0.2]" />
            ) : (
              <div className="grid h-full min-h-[420px] place-items-center bg-white/[0.02] text-cream/40">Location coming soon</div>
            )}
          </div>
        </div>
      </section>

      {/* ── Book (inline wizard) ── */}
      <section id="book" className="relative z-10 mx-auto max-w-5xl scroll-mt-24 px-5 py-20">
        <LuxHeading eyebrow="Book Now" title={<>Reserve your <span className="gold-text">chair</span></>} sub="Pick a service, barber, and time — it takes under a minute. No account needed." />
        {services.length === 0 ? (
          <div className="mt-10 rounded-2xl border border-white/10 bg-white/[0.02] p-8 text-center text-cream/50">Online booking is coming soon — give us a call to reserve.</div>
        ) : (
          <div className="mt-8">
            <BookingWizard slug={tenant.slug} brand={brand} services={svcForWizard} barbers={barbers.map((b) => ({ id: b.id, name: b.name }))} preselectedServiceId={null} />
          </div>
        )}
      </section>

      {/* ── Footer ── */}
      <footer className="relative z-10 border-t border-white/10 bg-[#070608]">
        <div className="mx-auto max-w-7xl px-5 py-14">
          <div className="flex flex-wrap items-start justify-between gap-8">
            <div className="max-w-sm">
              <div className="flex items-center gap-2.5">
                {tenant.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={tenant.logoUrl} alt={tenant.name} className="h-9 w-9 rounded-full object-cover" />
                ) : (
                  <span className="grid h-9 w-9 place-items-center rounded-full font-display font-bold" style={cta}>{tenant.name.charAt(0)}</span>
                )}
                <span className="font-display text-lg text-cream">{tenant.name}</span>
              </div>
              {tenant.tagline && <p className="mt-3 text-sm text-cream/50">{tenant.tagline}</p>}
              <a href="#book" className="mt-5 inline-flex rounded-full px-5 py-2.5 text-sm font-semibold" style={cta}>{bookLabel}</a>
              {(socials.length > 0 || tenant.website) && (
                <div className="mt-5 flex flex-wrap items-center gap-2">
                  {socials.map((s) => (
                    <a key={s.label} href={s.href} target="_blank" rel="noreferrer" className="rounded-full border border-white/12 px-3 py-1.5 text-xs text-cream/60 transition hover:border-brass/40 hover:text-brass">{s.label}</a>
                  ))}
                  {tenant.website && <a href={tenant.website} target="_blank" rel="noreferrer" className="rounded-full border border-white/12 px-3 py-1.5 text-xs text-cream/60 transition hover:border-brass/40 hover:text-brass">Website</a>}
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-8 text-sm sm:grid-cols-3">
              <div><div className="text-xs font-semibold uppercase tracking-[0.2em] text-cream/40">Explore</div><ul className="mt-3 space-y-2">{nav.map((n) => <li key={n.id}><a href={`#${n.id}`} className="text-cream/60 hover:text-brass">{n.label}</a></li>)}</ul></div>
              <div><div className="text-xs font-semibold uppercase tracking-[0.2em] text-cream/40">Visit</div><ul className="mt-3 space-y-2 text-cream/60">{tenant.address && <li>{tenant.address}</li>}{tenant.phone && <li><a href={`tel:${tenant.phone}`} className="hover:text-brass">{tenant.phone}</a></li>}{tenant.email && <li><a href={`mailto:${tenant.email}`} className="hover:text-brass">{tenant.email}</a></li>}</ul></div>
            </div>
          </div>
          <div className="mt-12 flex flex-col items-center justify-between gap-3 border-t border-white/10 pt-6 text-xs text-cream/40 sm:flex-row">
            <span>© {new Date().getFullYear()} {tenant.name}. All rights reserved.</span>
            <a href={appUrl("/")} className="text-cream/40 hover:text-brass">Powered by The Chair</a>
          </div>
        </div>
      </footer>

      {/* Sticky mobile book bar */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-black/85 p-3 backdrop-blur lg:hidden">
        <a href="#book" className="block w-full rounded-full py-3 text-center text-sm font-semibold shadow-lg" style={cta}>{bookLabel}</a>
      </div>
    </div>
  );
}

function InfoCard({ icon, title, lines, action }: { icon: "store" | "headset" | "messages"; title: string; lines: string[]; action?: { label: string; href: string } }) {
  const I = Icon[icon];
  return (
    <div className="p-panel flex items-start gap-4 p-5">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-brass/25 bg-brass/[0.06] text-brass"><I className="h-5 w-5" /></span>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold text-cream">{title}</div>
        {lines.map((l) => <div key={l} className="text-sm text-cream/55">{l}</div>)}
        {action && <a href={action.href} target={action.href.startsWith("http") ? "_blank" : undefined} rel="noreferrer" className="mt-1.5 inline-block text-sm font-medium text-brass hover:underline">{action.label}</a>}
      </div>
    </div>
  );
}
