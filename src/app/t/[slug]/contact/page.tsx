import Link from "next/link";
import { notFound } from "next/navigation";
import { TenantShell } from "@/components/TenantShell";
import { getTenantBySlug } from "@/lib/tenant";
import { readableOn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function TenantContactPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const tenant = await getTenantBySlug(slug);
  if (!tenant) notFound();

  // Keyless Google Maps embed for the preview; directions link opens the native
  // maps app on mobile and Google Maps on desktop.
  const q = tenant.address ? encodeURIComponent(tenant.address) : "";
  const embedUrl = `https://maps.google.com/maps?q=${q}&z=15&output=embed`;
  const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${q}`;

  return (
    <TenantShell tenant={tenant} active="contact">
      <section className="container-page max-w-2xl py-14">
        <h1 className="font-display text-4xl">Visit us</h1>

        {tenant.address && (
          <a
            href={directionsUrl}
            target="_blank"
            rel="noreferrer"
            className="group relative mt-8 block overflow-hidden rounded-2xl border border-white/10 shadow-lg shadow-black/30"
          >
            {/* pointer-events-none lets the whole preview act as one tap target */}
            <iframe
              title={`Map to ${tenant.name}`}
              src={embedUrl}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              className="pointer-events-none h-72 w-full border-0"
            />
            <span className="absolute inset-0" aria-hidden />
            <span
              className="btn absolute bottom-3 right-3 px-4 py-2 text-sm font-semibold shadow-lg"
              style={{ background: tenant.primaryColor, color: readableOn(tenant.primaryColor) }}
            >
              Get directions →
            </span>
          </a>
        )}

        <div className="card mt-6 space-y-3">
          {tenant.address && (
            <div>
              <div className="label">Address</div>
              <a href={directionsUrl} target="_blank" rel="noreferrer" style={{ color: tenant.primaryColor }}>{tenant.address}</a>
            </div>
          )}
          {tenant.phone && (
            <div>
              <div className="label">Phone</div>
              <a href={`tel:${tenant.phone}`} style={{ color: tenant.primaryColor }}>{tenant.phone}</a>
            </div>
          )}
          {tenant.email && (
            <div>
              <div className="label">Email</div>
              <a href={`mailto:${tenant.email}`} style={{ color: tenant.primaryColor }}>{tenant.email}</a>
            </div>
          )}
          <div className="pt-2">
            <Link href={`/t/${tenant.slug}/book`} className="btn-primary">Book an appointment</Link>
          </div>
        </div>
      </section>
    </TenantShell>
  );
}
