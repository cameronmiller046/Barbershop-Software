import Link from "next/link";
import { requirePlatformAdmin } from "@/lib/rbac";
import { CAPABILITIES } from "@/lib/roles";

export const dynamic = "force-dynamic";

const LEVELS = [
  { key: "superadmin" as const, name: "Superadmin", who: "You — the platform operator", color: "text-brass" },
  { key: "admin" as const, name: "Admin", who: "Shop owners", color: "text-blue-200" },
  { key: "standard" as const, name: "Standard user", who: "Barbers & front desk", color: "text-cream/80" },
];

export default async function RolesPage() {
  await requirePlatformAdmin();
  return (
    <div>
      <h1 className="font-display text-3xl">Roles &amp; permissions</h1>
      <p className="mt-1 max-w-2xl text-cream/60">
        Permissions follow a level hierarchy. A higher level can manage everyone below it.
        Assign levels per account in the <Link href="/admin/users" className="text-brass">Users console</Link>.
      </p>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {LEVELS.map((l) => (
          <div key={l.key} className="card">
            <h2 className={`font-display text-2xl ${l.color}`}>{l.name}</h2>
            <p className="mt-1 text-sm text-cream/60">{l.who}</p>
          </div>
        ))}
      </div>

      <div className="card mt-6 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-cream/50">
              <th className="pb-3 pr-4 font-medium">Capability</th>
              <th className="pb-3 px-3 text-center font-medium text-brass">Superadmin</th>
              <th className="pb-3 px-3 text-center font-medium text-blue-200">Admin</th>
              <th className="pb-3 px-3 text-center font-medium">Standard</th>
            </tr>
          </thead>
          <tbody>
            {CAPABILITIES.map((c) => (
              <tr key={c.area} className="border-t border-white/5">
                <td className="py-2.5 pr-4 text-cream/80">{c.area}</td>
                <Cell on={c.superadmin} />
                <Cell on={c.admin} />
                <Cell on={c.standard} />
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-4 text-xs text-cream/40">
        Capabilities are enforced server-side (see <code className="text-cream/60">src/lib/rbac.ts</code>);
        editing a user&apos;s level is the way to grant or revoke them.
      </p>
    </div>
  );
}

function Cell({ on }: { on: boolean }) {
  return (
    <td className="px-3 text-center">
      {on ? <span className="text-green-300">✓</span> : <span className="text-cream/20">—</span>}
    </td>
  );
}
