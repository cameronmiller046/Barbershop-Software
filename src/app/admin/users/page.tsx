import Link from "next/link";
import { requirePlatformAdmin } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { ROLE_SHORT, SUPERADMIN_ASSIGNABLE, ROLE_RANK } from "@/lib/roles";
import { changeUserRole, setUserActive, deleteUser, createUserAccount } from "@/app/admin/actions";
import type { Role } from "@prisma/client";

export const dynamic = "force-dynamic";

export default async function UsersPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const admin = await requirePlatformAdmin();
  const q = (await searchParams).q?.trim() || "";

  const [users, tenants] = await Promise.all([
    prisma.user.findMany({
      where: q ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { email: { contains: q, mode: "insensitive" } }] } : undefined,
      include: { tenant: { select: { name: true, slug: true } } },
      orderBy: [{ role: "asc" }, { name: "asc" }],
      take: 500,
    }),
    prisma.tenant.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  const sorted = [...users].sort((a, b) => ROLE_RANK[b.role] - ROLE_RANK[a.role] || a.name.localeCompare(b.name));

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl">Users</h1>
          <p className="mt-1 text-cream/60">Every account across the platform. Change levels, activate, or remove.</p>
        </div>
        <form className="flex gap-2">
          <input name="q" defaultValue={q} placeholder="Search name or email" className="input w-64" />
          <button className="btn-ghost">Search</button>
        </form>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-2">
          {sorted.map((u) => {
            const isSelf = u.id === admin.id;
            return (
              <div key={u.id} className="card py-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Link href={`/admin/users/${u.id}`} className="font-medium hover:text-brass">{u.name}</Link>
                      <span className={`badge ${u.role === "PLATFORM_ADMIN" ? "bg-brass/20 text-brass" : u.role === "OWNER" ? "bg-blue-500/20 text-blue-200" : "bg-white/10 text-cream/70"}`}>
                        {ROLE_SHORT[u.role]}
                      </span>
                      {!u.active && <span className="badge bg-red-500/20 text-red-200">inactive</span>}
                      {isSelf && <span className="chip">you</span>}
                    </div>
                    <div className="truncate text-sm text-cream/50">
                      {u.email}{u.tenant ? ` · ${u.tenant.name}` : u.role === "PLATFORM_ADMIN" ? " · platform" : ""}
                    </div>
                  </div>

                  {!isSelf && (
                    <div className="flex flex-wrap items-center gap-2">
                      <Link href={`/admin/users/${u.id}`} className="rounded-md border border-white/10 px-2 py-1.5 text-xs text-cream/70 hover:bg-white/5">Permissions</Link>
                      {/* Change level + store */}
                      <form action={changeUserRole.bind(null, u.id)} className="flex items-center gap-1">
                        <select name="role" defaultValue={u.role} className="input w-36 py-1.5 text-xs">
                          {SUPERADMIN_ASSIGNABLE.map((r) => (
                            <option key={r} value={r}>{ROLE_SHORT[r as Role]}</option>
                          ))}
                        </select>
                        <select name="tenantId" defaultValue={u.tenantId ?? ""} className="input w-40 py-1.5 text-xs">
                          <option value="">— store —</option>
                          {tenants.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                        </select>
                        <button className="rounded-md bg-brass/15 px-2 py-1.5 text-xs text-brass hover:bg-brass/25">Save</button>
                      </form>
                      <form action={setUserActive.bind(null, u.id, !u.active)}>
                        <button className="btn-ghost px-2 py-1.5 text-xs">{u.active ? "Deactivate" : "Activate"}</button>
                      </form>
                      <form action={deleteUser.bind(null, u.id)}>
                        <button className="rounded-md border border-red-500/30 px-2 py-1.5 text-xs text-red-300 hover:bg-red-500/10">Delete</button>
                      </form>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          {sorted.length === 0 && <div className="card text-cream/60">No users match “{q}”.</div>}
        </div>

        <aside className="card h-max">
          <h2 className="font-display text-xl">Create account</h2>
          <p className="mt-1 text-xs text-cream/50">Superadmin (no store), or an Admin / Standard user in a store.</p>
          <form action={createUserAccount} className="mt-4 space-y-3">
            <div><label className="label">Name</label><input name="name" required className="input" /></div>
            <div><label className="label">Email or username</label><input name="email" required className="input" /></div>
            <div><label className="label">Temporary password</label><input name="password" type="text" minLength={6} required className="input" /></div>
            <div>
              <label className="label">Level</label>
              <select name="role" className="input" defaultValue="BARBER">
                {SUPERADMIN_ASSIGNABLE.map((r) => <option key={r} value={r}>{ROLE_SHORT[r as Role]}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Store (skip for Superadmin)</label>
              <select name="tenantId" className="input" defaultValue="">
                <option value="">— none —</option>
                {tenants.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            <button className="btn-primary w-full">Create account</button>
          </form>
          <p className="mt-4 text-xs text-cream/40">
            Need a whole new shop? <Link href="/admin/tenants" className="text-brass">Create a store →</Link>
          </p>
        </aside>
      </div>
    </div>
  );
}
