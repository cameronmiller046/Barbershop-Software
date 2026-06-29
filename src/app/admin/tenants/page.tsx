import { requirePlatformAdmin } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { setTenantStatus, toggleFeature, createStore, deleteStore } from "@/app/admin/actions";
import { DeleteStoreButton } from "@/components/DeleteStoreButton";
import { appUrl } from "@/lib/utils";

export const dynamic = "force-dynamic";

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: "bg-green-500/20 text-green-200",
  PENDING: "bg-yellow-500/20 text-yellow-200",
  SUSPENDED: "bg-red-500/20 text-red-200",
};

export default async function TenantsPage() {
  await requirePlatformAdmin();
  const tenants = await prisma.tenant.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { users: true, appointments: true, services: true } } },
  });

  return (
    <div>
      <h1 className="font-display text-3xl">Stores</h1>

      <details className="card mt-6">
        <summary className="cursor-pointer font-display text-lg">+ Create a store (onboard a customer)</summary>
        <p className="mt-1 text-xs text-cream/50">
          Provisions a branded store, an Admin (owner) account with a temporary password,
          starter services, and weekday hours — and emails the owner their credentials.
        </p>
        <form action={createStore} className="mt-4 grid gap-3 sm:grid-cols-2">
          <div><label className="label">Business name</label><input name="businessName" required className="input" /></div>
          <div><label className="label">Owner name</label><input name="ownerName" required className="input" /></div>
          <div><label className="label">Owner email</label><input name="ownerEmail" type="email" required className="input" /></div>
          <div><label className="label">Phone (optional)</label><input name="phone" className="input" /></div>
          <div className="sm:col-span-2"><button className="btn-primary">Create store</button></div>
        </form>
      </details>

      {tenants.length === 0 ? (
        <div className="card mt-6 text-cream/60">No tenants yet. Approve a beta application to create one.</div>
      ) : (
        <div className="mt-6 space-y-3">
          {tenants.map((t) => (
            <div key={t.id} className="card">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-display text-xl">{t.name}</span>
                    <span className={`badge ${STATUS_COLORS[t.status]}`}>{t.status}</span>
                    <span className="chip">{t.plan}</span>
                  </div>
                  <a href={appUrl(`/t/${t.slug}`)} target="_blank" rel="noreferrer" className="text-sm text-brass">/t/{t.slug}</a>
                  <div className="mt-1 text-xs text-cream/50">
                    {t._count.users} users · {t._count.services} services · {t._count.appointments} appointments
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2 text-xs">
                  <div className="flex gap-2">
                    {t.status !== "ACTIVE" ? (
                      <form action={setTenantStatus.bind(null, t.id, "ACTIVE")}><button className="rounded-full bg-green-500/15 px-3 py-1 text-green-200">Activate</button></form>
                    ) : (
                      <form action={setTenantStatus.bind(null, t.id, "SUSPENDED")}><button className="rounded-full bg-red-500/15 px-3 py-1 text-red-200">Suspend</button></form>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <form action={toggleFeature.bind(null, t.id, "featureAnalytics", !t.featureAnalytics)}>
                      <button className={`rounded-full px-3 py-1 ${t.featureAnalytics ? "bg-brass/20 text-brass" : "bg-white/5 text-cream/40"}`}>Analytics</button>
                    </form>
                  </div>
                  <DeleteStoreButton action={deleteStore.bind(null, t.id)} storeName={t.name} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
