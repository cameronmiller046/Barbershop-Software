import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePlatformAdmin } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { ROLE_SHORT } from "@/lib/roles";
import { PERMISSIONS, overridesOf, roleDefault, can } from "@/lib/permissions";
import { setUserPermission, resetUserPermissions } from "@/app/admin/actions";

export const dynamic = "force-dynamic";

export default async function UserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePlatformAdmin();
  const { id } = await params;
  const user = await prisma.user.findUnique({ where: { id }, include: { tenant: { select: { name: true } } } });
  if (!user) notFound();

  const overrides = overridesOf(user);
  const isSuperadmin = user.role === "PLATFORM_ADMIN";

  return (
    <div className="max-w-3xl">
      <Link href="/admin/users" className="text-sm text-cream/50 hover:text-cream">← Users</Link>
      <h1 className="mt-3 font-display text-3xl">{user.name}</h1>
      <p className="mt-1 text-cream/60">
        {user.email} · <span className="text-cream/80">{ROLE_SHORT[user.role]}</span>
        {user.tenant ? ` · ${user.tenant.name}` : isSuperadmin ? " · platform" : ""}
      </p>

      {isSuperadmin ? (
        <div className="card mt-6 text-cream/70">
          Superadmins have every capability across the whole platform — there&apos;s nothing to toggle here.
        </div>
      ) : (
        <>
          <div className="mt-6 flex items-center justify-between">
            <h2 className="font-display text-2xl">Permissions</h2>
            <form action={resetUserPermissions.bind(null, user.id)}>
              <button className="btn-ghost text-xs">Reset all to defaults</button>
            </form>
          </div>
          <p className="mt-1 text-sm text-cream/50">
            Each capability follows the <b>{ROLE_SHORT[user.role]}</b> default unless you override it.
          </p>

          <div className="mt-4 space-y-2">
            {PERMISSIONS.map((p) => {
              const override = overrides[p.key]; // true | false | undefined
              const def = roleDefault(user.role, p.key);
              const effective = can(user, p.key);
              const current = override === undefined ? "default" : override ? "allow" : "deny";
              return (
                <div key={p.key} className="card flex flex-wrap items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{p.label}</span>
                      <span className={`badge ${effective ? "bg-green-500/20 text-green-200" : "bg-white/10 text-cream/50"}`}>
                        {effective ? "Allowed" : "Blocked"}
                      </span>
                    </div>
                    <div className="text-xs text-cream/50">{p.desc}</div>
                    <div className="mt-0.5 text-[11px] text-cream/30">
                      Default for {ROLE_SHORT[user.role]}: {def ? "Allowed" : "Blocked"}
                    </div>
                  </div>
                  <div className="flex overflow-hidden rounded-lg border border-white/10">
                    {(["default", "allow", "deny"] as const).map((opt) => (
                      <form key={opt} action={setUserPermission.bind(null, user.id, p.key, opt)}>
                        <button
                          className={`px-3 py-1.5 text-xs ${
                            current === opt
                              ? opt === "allow" ? "bg-green-500/25 text-green-100"
                              : opt === "deny" ? "bg-red-500/25 text-red-100"
                              : "bg-white/15 text-cream"
                              : "text-cream/50 hover:bg-white/5"
                          }`}
                        >
                          {opt === "default" ? "Default" : opt === "allow" ? "Allow" : "Deny"}
                        </button>
                      </form>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
