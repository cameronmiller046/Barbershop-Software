import { requirePlatformAdmin } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { approveApplication, rejectApplication } from "@/app/admin/actions";

export const dynamic = "force-dynamic";

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-yellow-500/20 text-yellow-200",
  APPROVED: "bg-green-500/20 text-green-200",
  REJECTED: "bg-red-500/20 text-red-200",
};

export default async function ApplicationsPage() {
  await requirePlatformAdmin();
  const apps = await prisma.betaApplication.findMany({ orderBy: { createdAt: "desc" } });

  return (
    <div>
      <h1 className="font-display text-3xl">Beta applications</h1>
      <p className="mt-1 text-cream/60">Approve to auto-provision a tenant, owner account, and starter site.</p>

      {apps.length === 0 ? (
        <div className="card mt-6 text-cream/60">No applications yet.</div>
      ) : (
        <div className="mt-6 space-y-3">
          {apps.map((a) => (
            <div key={a.id} className="card">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="font-display text-xl">{a.businessName}</div>
                  <div className="text-sm text-cream/60">{a.ownerName} · {a.email}{a.phone ? ` · ${a.phone}` : ""}</div>
                  {a.message && <p className="mt-2 max-w-xl text-sm text-cream/70">“{a.message}”</p>}
                  <div className="mt-1 text-xs text-cream/40">{new Date(a.createdAt).toLocaleString()}</div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className={`badge ${STATUS_COLORS[a.status]}`}>{a.status}</span>
                  {a.status === "PENDING" && (
                    <div className="flex gap-2">
                      <form action={approveApplication.bind(null, a.id)}>
                        <button className="btn-primary px-4 py-1.5 text-xs">Approve &amp; provision</button>
                      </form>
                      <form action={rejectApplication.bind(null, a.id)}>
                        <button className="rounded-full border border-red-500/30 px-4 py-1.5 text-xs text-red-300 hover:bg-red-500/10">Reject</button>
                      </form>
                    </div>
                  )}
                  {a.provisionedTenantId && <span className="text-xs text-cream/40">Provisioned ✓</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
