import Link from "next/link";
import { requirePlatformAdmin } from "@/lib/rbac";
import { CAPABILITIES } from "@/lib/roles";

export const dynamic = "force-dynamic";

const LEVELS = [
  { key: "superadmin" as const, name: "Superadmin", who: "You — the platform operator", color: "text-brass" },
  { key: "manager" as const, name: "Manager", who: "Runs a shop", color: "text-blue-200" },
  { key: "barber" as const, name: "Barber", who: "Shop staff", color: "text-cream/80" },
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
              <th className="pb-3 px-3 text-center font-medium text-blue-200">Manager</th>
              <th className="pb-3 px-3 text-center font-medium">Barber</th>
            </tr>
          </thead>
          <tbody>
            {CAPABILITIES.map((c) => (
              <tr key={c.area} className="border-t border-white/5">
                <td className="py-2.5 pr-4 text-cream/80">{c.area}</td>
                <Cell on={c.superadmin} />
                <Cell on={c.manager} />
                <Cell on={c.barber} />
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-4 text-xs text-cream/40">
        These are level <i>defaults</i>. You can override any capability for an individual
        account from their page in the <Link href="/admin/users" className="text-brass">Users console</Link>
        {" "}(Allow / Deny / Default) — e.g. give one barber Settings access without making them an Admin.
        Everything is enforced server-side in <code className="text-cream/60">src/lib/permissions.ts</code>.
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
