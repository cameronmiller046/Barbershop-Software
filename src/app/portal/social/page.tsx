import { requireTenantStaff } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { createSocialPost, setSocialStatus, deleteSocialPost } from "@/app/portal/actions";
import type { SocialStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

const COLUMNS: { key: SocialStatus; label: string; next?: SocialStatus }[] = [
  { key: "IDEA", label: "Ideas", next: "DRAFT" },
  { key: "DRAFT", label: "Drafts", next: "SCHEDULED" },
  { key: "SCHEDULED", label: "Scheduled", next: "POSTED" },
  { key: "POSTED", label: "Posted" },
];

const PLATFORMS = ["INSTAGRAM", "FACEBOOK", "TIKTOK", "X"] as const;

export default async function SocialPage() {
  const user = await requireTenantStaff();
  const posts = await prisma.socialPost.findMany({
    where: { tenantId: user.tenantId },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <h1 className="font-display text-3xl">Social planner</h1>
      <p className="mt-1 text-cream/60">Plan and organize posts. (Live publishing is on the roadmap.)</p>

      <details className="card mt-6">
        <summary className="cursor-pointer font-display text-lg">+ New post idea</summary>
        <form action={createSocialPost} className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2"><label className="label">Caption</label>
            <textarea name="caption" required className="input min-h-[80px]" placeholder="Fresh fade Friday 💈 Book your spot…" /></div>
          <div><label className="label">Image URL (optional)</label><input name="imageUrl" className="input" /></div>
          <div><label className="label">Schedule for (optional)</label><input name="scheduledFor" type="datetime-local" className="input" /></div>
          <div className="sm:col-span-2">
            <label className="label">Platforms</label>
            <div className="flex flex-wrap gap-3 text-sm">
              {PLATFORMS.map((p) => (
                <label key={p} className="flex items-center gap-1.5">
                  <input type="checkbox" name="platforms" value={p} /> {p[0] + p.slice(1).toLowerCase()}
                </label>
              ))}
            </div>
          </div>
          <input type="hidden" name="status" value="IDEA" />
          <div className="sm:col-span-2"><button className="btn-primary">Add to planner</button></div>
        </form>
      </details>

      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {COLUMNS.map((col) => {
          const items = posts.filter((p) => p.status === col.key);
          return (
            <div key={col.key} className="rounded-2xl border border-white/10 bg-charcoal/50 p-3">
              <h2 className="px-1 pb-2 text-sm font-semibold text-cream/70">{col.label} · {items.length}</h2>
              <div className="space-y-2">
                {items.map((p) => (
                  <div key={p.id} className="rounded-xl border border-white/10 bg-smoke p-3">
                    <p className="text-sm">{p.caption}</p>
                    {p.platforms.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {p.platforms.map((pl) => <span key={pl} className="chip text-[10px]">{pl}</span>)}
                      </div>
                    )}
                    {p.scheduledFor && (
                      <div className="mt-1 text-xs text-cream/40">{new Date(p.scheduledFor).toLocaleString()}</div>
                    )}
                    <div className="mt-2 flex gap-1">
                      {col.next && (
                        <form action={setSocialStatus.bind(null, p.id, col.next)}>
                          <button className="rounded-md bg-brass/15 px-2 py-1 text-[11px] text-brass hover:bg-brass/25">Move →</button>
                        </form>
                      )}
                      <form action={deleteSocialPost.bind(null, p.id)}>
                        <button className="rounded-md px-2 py-1 text-[11px] text-red-300 hover:bg-red-500/10">Delete</button>
                      </form>
                    </div>
                  </div>
                ))}
                {items.length === 0 && <p className="px-1 text-xs text-cream/30">Empty</p>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
