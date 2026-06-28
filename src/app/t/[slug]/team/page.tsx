import { notFound } from "next/navigation";
import { TenantShell } from "@/components/TenantShell";
import { getTenantBySlug, getTenantBarbers } from "@/lib/tenant";

export const dynamic = "force-dynamic";

export default async function TeamPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const tenant = await getTenantBySlug(slug);
  if (!tenant) notFound();
  const barbers = await getTenantBarbers(tenant.id);

  return (
    <TenantShell tenant={tenant} active="team">
      <section className="container-page py-14">
        <h1 className="font-display text-4xl">Meet the team</h1>
        {barbers.length === 0 ? (
          <div className="card mt-8 text-cream/60">The team will be introduced here soon.</div>
        ) : (
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {barbers.map((b) => (
              <div key={b.id} className="card text-center">
                {b.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={b.avatarUrl} alt={b.name} className="mx-auto h-28 w-28 rounded-full object-cover" />
                ) : (
                  <div
                    className="mx-auto grid h-28 w-28 place-items-center rounded-full font-display text-3xl"
                    style={{ background: tenant.primaryColor, color: "#0f0f10" }}
                  >
                    {b.name.charAt(0)}
                  </div>
                )}
                <h3 className="mt-4 font-display text-xl">{b.name}</h3>
                {b.bio && <p className="mt-1 text-sm text-cream/60">{b.bio}</p>}
                {b.instagramHandle && (
                  <p className="mt-2 text-xs text-cream/40">@{b.instagramHandle}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </TenantShell>
  );
}
