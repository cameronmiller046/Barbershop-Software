import { redirect } from "next/navigation";
import { requireStaffWithPerms } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { createBarber, toggleBarber, setStaffRole } from "@/app/portal/actions";
import { roleLabel } from "@/lib/roles";
import { can } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export default async function TeamPage() {
  const user = await requireStaffWithPerms();
  if (!can(user, "shop.team")) redirect("/portal");

  const team = await prisma.user.findMany({
    where: { tenantId: user.tenantId, role: { in: ["BARBER", "RECEPTIONIST"] } },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div>
      <h1 className="font-display text-3xl">Team</h1>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-3">
          {team.length === 0 ? (
            <div className="card text-cream/60">No staff yet — add your first barber.</div>
          ) : (
            team.map((m) => (
              <div key={m.id} className="card flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="font-medium">{m.name} {!m.active && <span className="chip ml-1">inactive</span>}</div>
                  <div className="text-sm text-cream/50">{m.email} · {roleLabel(m.role)}</div>
                </div>
                <div className="flex items-center gap-2">
                  <form action={setStaffRole.bind(null, m.id, m.role === "BARBER" ? "RECEPTIONIST" : "BARBER")}>
                    <button className="btn-ghost px-3 py-1.5 text-xs">
                      Make {m.role === "BARBER" ? "front desk" : "barber"}
                    </button>
                  </form>
                  <form action={toggleBarber.bind(null, m.id, !m.active)}>
                    <button className="btn-ghost px-3 py-1.5 text-xs">{m.active ? "Deactivate" : "Activate"}</button>
                  </form>
                </div>
              </div>
            ))
          )}
        </div>

        <aside className="card h-max">
          <h2 className="font-display text-xl">Add staff</h2>
          <form action={createBarber} className="mt-4 space-y-3">
            <div><label className="label">Name</label><input name="name" required className="input" /></div>
            <div><label className="label">Email</label><input name="email" type="email" required className="input" /></div>
            <div><label className="label">Temporary password</label><input name="password" type="text" required minLength={6} className="input" /></div>
            <div>
              <label className="label">Role</label>
              <select name="role" className="input">
                <option value="BARBER">Barber</option>
                <option value="RECEPTIONIST">Receptionist</option>
              </select>
            </div>
            <div><label className="label">Bio (optional)</label><input name="bio" className="input" /></div>
            <button className="btn-primary w-full">Add to team</button>
          </form>
        </aside>
      </div>
    </div>
  );
}
