import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTenantBySlug, getTenantServices, getTenantGallery } from "@/lib/tenant";
import { appUrl } from "@/lib/utils";
import { ShopHeader } from "@/components/shop/ShopHeader";
import { ShopGallery, type Shot } from "@/components/shop/ShopGallery";
import { QMARK } from "@/lib/placeholder";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const t = await getTenantBySlug(slug);
  if (!t) return { title: "Gallery" };
  return { title: `Gallery — ${t.name}`, description: `See the work and the shop at ${t.name}.`, alternates: { canonical: appUrl(`/t/${t.slug}/gallery`) } };
}

export default async function GalleryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const t = await getTenantBySlug(slug);
  if (!t) notFound();
  const [gallery, services] = await Promise.all([getTenantGallery(t.id), getTenantServices(t.id)]);

  const shots: Shot[] = [
    ...gallery.map((g) => ({ src: g.imageUrl, alt: g.caption || `${t.name} barbershop` })),
    ...services.filter((s) => s.imageUrl).map((s) => ({ src: s.imageUrl as string, alt: `${s.name} at ${t.name}` })),
  ];
  if (shots.length < 8) shots.push(...Array.from({ length: 8 - shots.length }, () => ({ src: QMARK, alt: "Photo coming soon" })));

  return (
    <main className="pb-24">
      <ShopHeader eyebrow="Our Work" title={<>Fresh cuts, <span className="gold-text">every day</span></>} sub="A look inside the shop and the work that walks out the door." />
      <section className="relative z-10 mx-auto max-w-7xl px-5 pb-10">
        <ShopGallery shots={shots.slice(0, 24)} />
      </section>
    </main>
  );
}
