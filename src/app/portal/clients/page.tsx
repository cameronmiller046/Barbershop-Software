import { redirect } from "next/navigation";
import { requireStaffWithPerms } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/permissions";
import { saveClientNotes } from "@/app/portal/actions";

export const dynamic = "force-dynamic";

export default async function ClientsPage() {
  const user = await requireStaffWithPerms();
  if (!can(user, "shop.clients")) redirect("/portal");
  const clients = await prisma.client.findMany({
    where: { tenantId: user.tenantId },
    include: {
      _count: { select: { appointments: true } },
      appointments: {
        orderBy: { startTime: "desc" },
        take: 10,
        include: { service: { select: { name: true } }, barber: { select: { name: true } } },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 300,
  });

  const STATUS_BADGE: Record<string, string> = {
    CONFIRMED: "bg-amber-500/20 text-amber-200",
    COMPLETED: "bg-emerald-500/20 text-emerald-200",
    CANCELLED: "bg-red-500/20 text-red-200",
    NO_SHOW: "bg-zinc-500/25 text-zinc-200",
  };

  return (
    <div>
      <h1 className="font-display text-3xl">Clients</h1>
      <p className="mt-1 text-cream/60">{clients.length} client{clients.length === 1 ? "" : "s"}</p>

      {clients.length === 0 ? (
        <div className="card mt-6 text-cream/60">No clients yet — they&apos;ll appear here after the first booking.</div>
      ) : (
        <div className="mt-6 space-y-3">
          {clients.map((c) => (
            <details key={c.id} className="card">
              <summary className="flex cursor-pointer items-center justify-between">
                <div>
                  <div className="font-medium">{c.name}</div>
                  <div className="text-sm text-cream/50">
                    {[c.email, c.phone].filter(Boolean).join(" · ") || "No contact info"}
                  </div>
                </div>
                <span className="chip">{c._count.appointments} visits</span>
              </summary>
              <div className="mt-4">
                <div className="label">Appointment history</div>
                {c.appointments.length === 0 ? (
                  <p className="text-sm text-cream/50">No appointments yet.</p>
                ) : (
                  <ul className="divide-y divide-white/5">
                    {c.appointments.map((a) => (
                      <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                        <div>
                          <span className={a.active ? "" : "text-cream/40 line-through"}>
                            {new Date(a.startTime).toLocaleString(undefined, { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" })}
                          </span>
                          <span className="ml-2 text-cream/50">{a.service.name} · {a.barber.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {!a.active && <span className="badge bg-white/10 text-cream/50">removed</span>}
                          <span className={`badge ${STATUS_BADGE[a.status] || "bg-white/10"}`}>{a.status.replace("_", " ")}</span>
                          {a.statusReason && <span className="text-[11px] text-cream/40">· {a.statusReason}</span>}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <form action={saveClientNotes.bind(null, c.id)} className="mt-4">
                <label className="label">Private notes</label>
                <textarea name="notes" defaultValue={c.notes ?? ""} className="input min-h-[80px]"
                  placeholder="Preferred style, allergies, conversation notes…" />
                <button className="btn-ghost mt-2">Save notes</button>
              </form>
            </details>
          ))}
        </div>
      )}
    </div>
  );
}
