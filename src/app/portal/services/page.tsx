import { redirect } from "next/navigation";
import { requireStaffWithPerms } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { formatMoney, formatDuration } from "@/lib/utils";
import { can } from "@/lib/permissions";
import { createService, toggleService, deleteService } from "@/app/portal/actions";

export const dynamic = "force-dynamic";

export default async function ServicesPage() {
  const user = await requireStaffWithPerms();
  if (!can(user, "shop.services")) redirect("/portal");
  const [services, barbers] = await Promise.all([
    prisma.service.findMany({ where: { tenantId: user.tenantId }, include: { barber: { select: { name: true } } }, orderBy: { sortOrder: "asc" } }),
    prisma.user.findMany({ where: { tenantId: user.tenantId, role: "BARBER", active: true }, select: { id: true, name: true } }),
  ]);

  return (
    <div>
      <h1 className="font-display text-3xl">Services</h1>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-3">
          {services.length === 0 ? (
            <div className="card text-cream/60">No services yet — add your first one.</div>
          ) : (
            services.map((s) => (
              <div key={s.id} className="card flex items-center justify-between gap-3">
                <div>
                  <div className="font-medium">{s.name} {!s.active && <span className="chip ml-1">hidden</span>}</div>
                  <div className="text-sm text-cream/50">
                    {formatMoney(s.priceCents)} · {formatDuration(s.durationMin)}{s.barber ? ` · ${s.barber.name}` : ""}
                  </div>
                </div>
                <div className="flex gap-2">
                  <form action={toggleService.bind(null, s.id, !s.active)}>
                    <button className="btn-ghost px-3 py-1.5 text-xs">{s.active ? "Hide" : "Show"}</button>
                  </form>
                  <form action={deleteService.bind(null, s.id)}>
                    <button className="rounded-full border border-red-500/30 px-3 py-1.5 text-xs text-red-300 hover:bg-red-500/10">Delete</button>
                  </form>
                </div>
              </div>
            ))
          )}
        </div>

        <aside className="card h-max">
          <h2 className="font-display text-xl">Add a service</h2>
          <form action={createService} className="mt-4 space-y-3">
            <div><label className="label">Name</label><input name="name" required className="input" /></div>
            <div><label className="label">Description</label><input name="description" className="input" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="label">Price ($)</label><input name="price" type="number" step="0.01" min="0" defaultValue="35" className="input" /></div>
              <div><label className="label">Minutes</label><input name="durationMin" type="number" min="5" step="5" defaultValue="30" className="input" /></div>
            </div>
            <div>
              <label className="label">Barber (optional)</label>
              <select name="barberId" className="input">
                <option value="">Any barber</option>
                {barbers.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
            <button className="btn-primary w-full">Add service</button>
          </form>
        </aside>
      </div>
    </div>
  );
}
