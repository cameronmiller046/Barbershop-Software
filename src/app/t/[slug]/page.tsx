import Link from "next/link";
import { notFound } from "next/navigation";
import { TenantShell } from "@/components/TenantShell";
import { QrCode } from "@/components/QrCode";
import { getTenantBySlug, getTenantServices, getTenantReviews } from "@/lib/tenant";
import { formatMoney, formatDuration, appUrl, readableOn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function TenantHome({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const tenant = await getTenantBySlug(slug);
  if (!tenant) notFound();

  const [services, reviews] = await Promise.all([
    getTenantServices(tenant.id),
    getTenantReviews(tenant.id),
  ]);
  const bookUrl = appUrl(`/t/${tenant.slug}/book`);

  return (
    <TenantShell tenant={tenant} active="home">
      <section className="container-page grid items-center gap-10 py-16 md:grid-cols-2">
        <div>
          <span className="chip">{tenant.address || "Walk-ins welcome"}</span>
          <h1 className="mt-4 font-display text-5xl leading-tight md:text-6xl">{tenant.name}</h1>
          <p className="mt-4 max-w-md text-cream/70">{tenant.tagline || "Sharp cuts, good company."}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href={`/t/${tenant.slug}/book`} className="btn-primary px-7 py-3 text-base">Book an appointment</Link>
            <Link href={`/t/${tenant.slug}/services`} className="btn-ghost px-7 py-3 text-base">View services</Link>
          </div>
        </div>
        <div className="justify-self-center">
          <div className="card flex flex-col items-center gap-4 text-center">
            <span className="font-display text-xl text-brass">Scan to book</span>
            <QrCode value={bookUrl} size={220} dark="#0f0f10" light="#f5f1e8" />
            <p className="max-w-[14rem] text-sm text-cream/60">
              Print this for the front desk — it links straight to booking.
            </p>
          </div>
        </div>
      </section>

      <section id="services" className="container-page py-10">
        <div className="mb-6 flex items-end justify-between">
          <h2 className="font-display text-3xl">Popular services</h2>
          <Link href={`/t/${tenant.slug}/services`} className="btn-ghost hidden sm:inline-flex">All services</Link>
        </div>
        {services.length === 0 ? (
          <div className="card text-cream/60">Services coming soon.</div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {services.slice(0, 6).map((s) => (
              <div key={s.id} className="card flex flex-col">
                <div className="flex items-baseline justify-between">
                  <h3 className="font-display text-xl">{s.name}</h3>
                  <span style={{ color: tenant.primaryColor }}>{formatMoney(s.priceCents)}</span>
                </div>
                {s.description && <p className="mt-1 text-sm text-cream/60">{s.description}</p>}
                <div className="mt-3 flex gap-2 text-xs">
                  <span className="chip">{formatDuration(s.durationMin)}</span>
                  {s.barber && <span className="chip">with {s.barber.name}</span>}
                </div>
                <Link href={`/t/${tenant.slug}/book?service=${s.id}`} className="btn-primary mt-5">Book this</Link>
              </div>
            ))}
          </div>
        )}
      </section>

      {reviews.length > 0 && (
        <section className="container-page py-10">
          <h2 className="font-display text-3xl">What clients say</h2>
          <div className="mt-6 grid gap-5 md:grid-cols-3">
            {reviews.slice(0, 3).map((r) => (
              <div key={r.id} className="card">
                <div style={{ color: tenant.primaryColor }}>{"★".repeat(r.rating)}</div>
                <p className="mt-2 text-sm text-cream/75">“{r.body}”</p>
                <p className="mt-3 text-xs text-cream/50">— {r.authorName}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="container-page py-12">
        <div
          className="card flex flex-col items-center gap-3 text-center"
          style={{ background: `linear-gradient(135deg, ${tenant.primaryColor}1a, transparent)` }}
        >
          <h2 className="font-display text-3xl">Ready for a fresh cut?</h2>
          <Link
            href={`/t/${tenant.slug}/book`}
            className="btn px-7 py-3 text-base"
            style={{ background: tenant.primaryColor, color: readableOn(tenant.primaryColor) }}
          >
            Book now
          </Link>
        </div>
      </section>
    </TenantShell>
  );
}
