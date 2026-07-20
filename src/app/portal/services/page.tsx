import { redirect } from "next/navigation";
import { requireStaffWithPerms } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { formatMoney, formatDuration } from "@/lib/utils";
import { QMARK } from "@/lib/placeholder";
import { can } from "@/lib/permissions";
import { toggleService, deleteService, createService, setServiceImage, setServiceImagePosition } from "@/app/portal/actions";
import { AddServiceForm } from "@/components/AddServiceForm";
import { ServicePhotoForm } from "@/components/ServicePhotoForm";
import { ServiceFocusPicker } from "@/components/ServiceFocusPicker";

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
                <div className="flex items-center gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={s.imageUrl || QMARK} alt={s.name} className="h-14 w-14 shrink-0 rounded-lg object-cover" style={{ objectPosition: s.imagePosition }} />
                  <div>
                    <div className="font-medium">{s.name} {!s.active && <span className="chip ml-1">hidden</span>}</div>
                    <div className="text-sm text-cream/50">
                      {formatMoney(s.priceCents)} · {formatDuration(s.durationMin)}{s.barber ? ` · ${s.barber.name}` : ""}
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <ServicePhotoForm action={setServiceImage.bind(null, s.id)} hasImage={!!s.imageUrl} />
                  {s.imageUrl && <ServiceFocusPicker imageUrl={s.imageUrl} initial={s.imagePosition} action={setServiceImagePosition.bind(null, s.id)} />}
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
          <AddServiceForm action={createService} barbers={barbers} />
        </aside>
      </div>
    </div>
  );
}
