import { notFound } from "next/navigation";
import { TenantShell } from "@/components/TenantShell";
import { getTenantBySlug, getTenantGallery } from "@/lib/tenant";

export const dynamic = "force-dynamic";

export default async function GalleryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const tenant = await getTenantBySlug(slug);
  if (!tenant) notFound();
  const items = await getTenantGallery(tenant.id);

  return (
    <TenantShell tenant={tenant} active="gallery">
      <section className="container-page py-14">
        <h1 className="font-display text-4xl">Gallery</h1>
        {items.length === 0 ? (
          <div className="card mt-8 text-cream/60">Photos of our work will appear here.</div>
        ) : (
          <div className="mt-8 columns-2 gap-4 md:columns-3 [&>*]:mb-4">
            {items.map((g) => (
              <figure key={g.id} className="overflow-hidden rounded-xl border border-white/10">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={g.imageUrl} alt={g.caption || "Gallery image"} className="w-full" />
                {g.caption && <figcaption className="bg-charcoal px-3 py-2 text-xs text-cream/60">{g.caption}</figcaption>}
              </figure>
            ))}
          </div>
        )}
      </section>
    </TenantShell>
  );
}
