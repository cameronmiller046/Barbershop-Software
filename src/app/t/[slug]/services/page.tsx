import Link from "next/link";
import { notFound } from "next/navigation";
import { TenantShell } from "@/components/TenantShell";
import { getTenantBySlug, getTenantServices } from "@/lib/tenant";
import { formatMoney, formatDuration } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ServicesPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const tenant = await getTenantBySlug(slug);
  if (!tenant) notFound();
  const services = await getTenantServices(tenant.id);

  return (
    <TenantShell tenant={tenant} active="services">
      <section className="container-page py-14">
        <h1 className="font-display text-4xl">Services</h1>
        <p className="mt-2 text-cream/60">Every service includes a consultation.</p>
        {services.length === 0 ? (
          <div className="card mt-8 text-cream/60">Services coming soon.</div>
        ) : (
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {services.map((s) => (
              <div key={s.id} className="card flex flex-col">
                {s.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={s.imageUrl} alt={s.name} className="mb-4 h-40 w-full rounded-xl object-cover" />
                ) : (
                  <div className="mb-4 grid h-40 w-full place-items-center rounded-xl bg-smoke text-4xl text-brass/40">✂</div>
                )}
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
    </TenantShell>
  );
}
