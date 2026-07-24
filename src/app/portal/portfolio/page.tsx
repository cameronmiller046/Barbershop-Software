import { requirePortalStaff } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { appUrl } from "@/lib/utils";
import { PortfolioUploader } from "@/components/portal/PortfolioUploader";
import { addGalleryPhoto, deleteGalleryPhoto } from "./actions";

export const dynamic = "force-dynamic";

export default async function PortfolioPage() {
  const user = await requirePortalStaff();
  const [tenant, photos] = await Promise.all([
    prisma.tenant.findUnique({ where: { id: user.tenantId }, select: { slug: true, showGallery: true } }),
    prisma.galleryItem.findMany({ where: { tenantId: user.tenantId }, orderBy: { sortOrder: "desc" } }),
  ]);
  const liveUrl = appUrl(`/t/${tenant?.slug ?? ""}/gallery`);

  return (
    <div className="mx-auto max-w-4xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl text-cream">Portfolio</h1>
          <p className="mt-1 text-sm text-cream/50">Post photos of your work — they show on your shop&apos;s public gallery.</p>
        </div>
        <a href={liveUrl} target="_blank" rel="noreferrer" className="btn-outline-gold !py-2 text-sm">View live gallery ↗</a>
      </div>

      {tenant && !tenant.showGallery && (
        <p className="mt-5 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          Your gallery section is currently hidden on your website. Turn it on under{" "}
          <a href="/portal/website" className="font-semibold underline">Website Content</a> so these photos show publicly.
        </p>
      )}

      <div className="mt-6">
        <PortfolioUploader action={addGalleryPhoto} />
      </div>

      {photos.length === 0 ? (
        <p className="mt-8 rounded-2xl border border-white/10 bg-white/[0.02] p-10 text-center text-sm text-cream/50">
          No photos yet — add your first cut above.
        </p>
      ) : (
        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {photos.map((p) => (
            <div key={p.id} className="group relative overflow-hidden rounded-xl border border-white/10 bg-white/[0.02]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.imageUrl} alt={p.caption || "Cut"} className="aspect-square w-full object-cover" />
              {p.caption && <div className="truncate px-2 py-1 text-[11px] text-cream/60">{p.caption}</div>}
              <form action={deleteGalleryPhoto} className="absolute right-1.5 top-1.5">
                <input type="hidden" name="id" value={p.id} />
                <button
                  type="submit"
                  title="Delete photo"
                  className="grid h-7 w-7 place-items-center rounded-full bg-black/60 text-sm text-cream/80 opacity-0 transition hover:bg-red-500/80 group-hover:opacity-100"
                >
                  ✕
                </button>
              </form>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
