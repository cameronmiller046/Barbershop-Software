import Link from "next/link";
import { requirePlatformAdmin } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminOverview() {
  await requirePlatformAdmin();
  const [tenants, activeTenants, users, pendingApps, appointments, recentLogs] = await Promise.all([
    prisma.tenant.count(),
    prisma.tenant.count({ where: { status: "ACTIVE" } }),
    prisma.user.count(),
    prisma.betaApplication.count({ where: { status: "PENDING" } }),
    prisma.appointment.count({ where: { active: true } }),
    prisma.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 10 }),
  ]);

  const stats: { label: string; value: number; href?: string }[] = [
    { label: "Stores", value: tenants, href: "/admin/tenants" },
    { label: "Active stores", value: activeTenants, href: "/admin/tenants" },
    { label: "User accounts", value: users },
    { label: "Pending applications", value: pendingApps, href: "/admin/applications" },
    { label: "Appointments booked", value: appointments, href: "/admin/tenants" },
  ];

  return (
    <div>
      <h1 className="font-display text-3xl">Superadmin overview</h1>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {stats.map((s) =>
          s.href ? (
            <Link key={s.label} href={s.href} className="stat block">
              <div className="text-3xl font-bold text-brass">{s.value}</div>
              <div className="mt-1 text-xs text-cream/50">{s.label}</div>
            </Link>
          ) : (
            <div key={s.label} className="stat block">
              <div className="text-3xl font-bold text-brass">{s.value}</div>
              <div className="mt-1 text-xs text-cream/50">{s.label}</div>
            </div>
          )
        )}
      </div>

      <div className="card mt-6">
        <h2 className="font-display text-xl">Accounts &amp; permissions</h2>
        <p className="mt-1 text-sm text-cream/60">
          User accounts and permissions are now managed centrally in Yggdrasil, the
          Mocazari fleet management plane. The in-app Users and Roles consoles have
          been retired.
        </p>
      </div>

      <h2 className="mt-10 font-display text-2xl">Recent activity</h2>
      <div className="card mt-4">
        {recentLogs.length === 0 ? (
          <p className="text-cream/50">No activity yet.</p>
        ) : (
          <ul className="divide-y divide-white/5 text-sm">
            {recentLogs.map((l) => (
              <li key={l.id} className="flex items-center justify-between py-2">
                <span className="text-cream/80">{l.action}{l.target ? ` · ${l.target}` : ""}</span>
                <span className="text-xs text-cream/40">{new Date(l.createdAt).toLocaleString()}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
