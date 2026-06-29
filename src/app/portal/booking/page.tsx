import { redirect } from "next/navigation";
import { requireStaffWithPerms } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/permissions";
import { minutesToHHMM, dayName } from "@/lib/utils";
import { updateBookingInterval, updateBarberHours } from "@/app/portal/actions";

export const dynamic = "force-dynamic";

const INTERVALS = [10, 15, 20, 30, 45, 60];
// Display order Mon→Sun (dayOfWeek values)
const DOW_ORDER = [1, 2, 3, 4, 5, 6, 0];

export default async function BookingSettingsPage() {
  const user = await requireStaffWithPerms();
  if (!can(user, "shop.settings")) redirect("/portal");

  const tenant = await prisma.tenant.findUnique({ where: { id: user.tenantId } });
  if (!tenant) redirect("/portal");

  const barbers = await prisma.user.findMany({
    where: { tenantId: user.tenantId, role: "BARBER" },
    orderBy: { name: "asc" },
    include: { workingHours: true },
  });

  return (
    <div className="max-w-3xl">
      <h1 className="font-display text-3xl">Booking</h1>
      <p className="mt-1 text-cream/60">Control how customers can book online.</p>

      {/* Slot interval */}
      <form action={updateBookingInterval} className="card mt-6">
        <h2 className="font-display text-xl">Time slot interval</h2>
        <p className="mt-1 text-sm text-cream/50">How far apart bookable start times are.</p>
        <div className="mt-3 flex items-center gap-3">
          <select name="slotIntervalMin" defaultValue={String(tenant.slotIntervalMin)} className="input w-40">
            {INTERVALS.map((m) => <option key={m} value={m}>{m} minutes</option>)}
          </select>
          <button className="btn-primary">Save</button>
        </div>
      </form>

      {/* Per-barber working hours */}
      <h2 className="mt-8 font-display text-2xl">Working hours</h2>
      <p className="mt-1 text-sm text-cream/50">Set each barber&apos;s open hours per day. Closed days can&apos;t be booked.</p>

      <div className="mt-4 space-y-4">
        {barbers.length === 0 && <div className="card text-cream/60">No barbers yet.</div>}
        {barbers.map((b) => {
          const byDow = new Map(b.workingHours.map((w) => [w.dayOfWeek, w]));
          return (
            <form key={b.id} action={updateBarberHours.bind(null, b.id)} className="card">
              <h3 className="font-display text-lg">{b.name}</h3>
              <div className="mt-3 space-y-1.5">
                {DOW_ORDER.map((dow) => {
                  const wh = byDow.get(dow);
                  return (
                    <div key={dow} className="flex flex-wrap items-center gap-3 text-sm">
                      <span className="w-24 text-cream/70">{dayName(dow)}</span>
                      <input type="time" name={`open_${dow}`} defaultValue={wh ? minutesToHHMM(wh.startMin) : "09:00"} className="input w-32 py-1.5" />
                      <span className="text-cream/40">to</span>
                      <input type="time" name={`close_${dow}`} defaultValue={wh ? minutesToHHMM(wh.endMin) : "17:00"} className="input w-32 py-1.5" />
                      <label className="flex items-center gap-1.5 text-cream/60">
                        <input type="checkbox" name={`closed_${dow}`} defaultChecked={!wh} /> Closed
                      </label>
                    </div>
                  );
                })}
              </div>
              <button className="btn-primary mt-4">Save {b.name}&apos;s hours</button>
            </form>
          );
        })}
      </div>
    </div>
  );
}
