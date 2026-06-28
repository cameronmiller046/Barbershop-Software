import Link from "next/link";
import { notFound } from "next/navigation";
import { TenantShell } from "@/components/TenantShell";
import { BookingWizard } from "@/components/BookingWizard";
import { getTenantBySlug, getTenantServices, getTenantBarbers } from "@/lib/tenant";

export const dynamic = "force-dynamic";

export default async function BookPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ service?: string }>;
}) {
  const { slug } = await params;
  const sp = await searchParams;
  const tenant = await getTenantBySlug(slug);
  if (!tenant) notFound();

  const [services, barbers] = await Promise.all([
    getTenantServices(tenant.id),
    getTenantBarbers(tenant.id),
  ]);

  return (
    <TenantShell tenant={tenant} active="book">
      <section className="container-page py-12">
        <Link href={`/t/${tenant.slug}`} className="text-sm text-cream/50 hover:text-cream">← Back</Link>
        <h1 className="mt-3 font-display text-4xl">Book your chair</h1>
        <p className="mt-1 text-cream/60">Pick a service, barber, and time.</p>

        {services.length === 0 ? (
          <div className="card mt-8 text-cream/60">No services are available to book yet.</div>
        ) : (
          <BookingWizard
            slug={tenant.slug}
            brand={tenant.primaryColor}
            services={services.map((s) => ({
              id: s.id, name: s.name, description: s.description, durationMin: s.durationMin,
              priceCents: s.priceCents, barberId: s.barberId, barberName: s.barber?.name ?? null,
            }))}
            barbers={barbers.map((b) => ({ id: b.id, name: b.name }))}
            preselectedServiceId={sp.service ?? null}
          />
        )}
      </section>
    </TenantShell>
  );
}
