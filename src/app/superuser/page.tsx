import { redirect } from "next/navigation";
import { requireUser } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { getSelectedStoreId, setSelectedStoreId } from "@/lib/superuser";
import { signOut } from "@/lib/auth";

export const dynamic = "force-dynamic";

// Hidden dev-team console: a SUPERUSER picks any store and is dropped into that
// store's portal (full access) for troubleshooting. Not linked anywhere public.
export default async function SuperuserStores() {
  const user = await requireUser("/superuser");
  if (user.role !== "SUPERUSER") redirect("/portal");

  const [stores, current] = await Promise.all([
    prisma.tenant.findMany({
      select: { id: true, name: true, slug: true, status: true, isDemo: true, _count: { select: { users: true, appointments: true } } },
      orderBy: [{ isDemo: "asc" }, { name: "asc" }],
    }),
    getSelectedStoreId(),
  ]);

  async function pick(formData: FormData) {
    "use server";
    const u = await requireUser("/superuser");
    if (u.role !== "SUPERUSER") redirect("/portal");
    const id = String(formData.get("id") || "");
    const store = await prisma.tenant.findUnique({ where: { id }, select: { id: true } });
    if (!store) redirect("/superuser");
    await setSelectedStoreId(id);
    redirect("/portal");
  }

  async function signOutAction() {
    "use server";
    await signOut({ redirectTo: "/login" });
  }

  return (
    <div className="portal min-h-screen">
      <div className="mx-auto max-w-4xl px-5 py-12">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-brass">Superuser · dev troubleshooting</div>
            <h1 className="mt-2 font-display text-3xl text-cream">Choose a store to inspect</h1>
            <p className="mt-1 text-sm text-cream/60">You&apos;ll enter the selected store&apos;s portal with full access. Switch stores anytime from the banner.</p>
          </div>
          <form action={signOutAction}>
            <button className="p-btn-ghost text-sm" type="submit">Sign out</button>
          </form>
        </div>

        <div className="mt-8 space-y-2">
          {stores.map((s) => (
            <form key={s.id} action={pick}>
              <input type="hidden" name="id" value={s.id} />
              <button
                type="submit"
                className="flex w-full items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.02] px-5 py-4 text-left transition hover:border-brass/40 hover:bg-white/[0.04]"
              >
                <span className="min-w-0">
                  <span className="flex items-center gap-2">
                    <span className="truncate text-lg font-medium text-cream">{s.name}</span>
                    {s.isDemo && <span className="rounded-full border border-white/15 px-2 py-0.5 text-[10px] uppercase tracking-wide text-cream/50">Demo</span>}
                    {s.status !== "ACTIVE" && <span className="rounded-full border border-amber-400/30 bg-amber-400/10 px-2 py-0.5 text-[10px] uppercase tracking-wide text-amber-300">{s.status}</span>}
                    {current === s.id && <span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2 py-0.5 text-[10px] uppercase tracking-wide text-emerald-300">Current</span>}
                  </span>
                  <span className="mt-0.5 block truncate text-xs text-cream/40">/{s.slug} · {s._count.users} accounts · {s._count.appointments} appointments</span>
                </span>
                <span className="shrink-0 text-brass">View portal →</span>
              </button>
            </form>
          ))}
          {stores.length === 0 && <p className="rounded-2xl border border-white/10 bg-white/[0.02] px-5 py-8 text-center text-cream/50">No stores exist yet.</p>}
        </div>
      </div>
    </div>
  );
}
