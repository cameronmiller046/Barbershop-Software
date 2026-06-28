import Link from "next/link";
import { notFound } from "next/navigation";
import { TenantShell } from "@/components/TenantShell";
import { getTenantBySlug } from "@/lib/tenant";

export const dynamic = "force-dynamic";

export default async function TenantContactPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const tenant = await getTenantBySlug(slug);
  if (!tenant) notFound();

  return (
    <TenantShell tenant={tenant} active="contact">
      <section className="container-page max-w-2xl py-14">
        <h1 className="font-display text-4xl">Visit us</h1>
        <div className="card mt-8 space-y-3">
          {tenant.address && (
            <div>
              <div className="label">Address</div>
              <p>{tenant.address}</p>
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
