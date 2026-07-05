import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTenantBySlug, getTenantServices } from "@/lib/tenant";
import { appUrl } from "@/lib/utils";
import { ShopHeader } from "@/components/shop/ShopHeader";
import { ShopServices } from "@/components/shop/ShopServices";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const t = await getTenantBySlug(slug);
  if (!t) return { title: "Services" };
  return { title: `Services & Prices — ${t.name}`, description: `Browse haircuts, beard services, and more at ${t.name}. See prices and book online in under a minute.`, alternates: { canonical: appUrl(`/t/${t.slug}/services`) } };
}

export default async function ServicesPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const t = await getTenantBySlug(slug);
  if (!t) notFound();
  const services = await getTenantServices(t.id);
  const base = `/t/${t.slug}`;

  return (
    <main className="pb-24">
      <ShopHeader eyebrow="The Menu" title={<>Services &amp; <span className="gold-text">prices</span></>} sub="Every service, with real times and prices. Filter by what you're after." />
      <section className="relative z-10 mx-auto max-w-7xl px-5 pb-10">
        {services.length === 0 ? (
          <div className="mt-10 rounded-2xl border border-white/10 bg-white/[0.02] p-8 text-center text-cream/50">Services coming soon.</div>
        ) : (
          <ShopServices services={services.map((s) => ({ id: s.id, name: s.name, description: s.description, durationMin: s.durationMin, priceCents: s.priceCents, imageUrl: s.imageUrl, barberName: s.barber?.name ?? null }))} bookBase={`${base}/book`} />
        )}
      </section>
    </main>
  );
}
