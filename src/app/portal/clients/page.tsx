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
    include: { _count: { select: { appointments: true } } },
    orderBy: { createdAt: "desc" },
    take: 300,
  });

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
