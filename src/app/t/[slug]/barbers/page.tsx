import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTenantBySlug, getTenantBarbers } from "@/lib/tenant";
import { appUrl } from "@/lib/utils";
import { Stagger, Item } from "@/components/home/motion";
import { ShopHeader } from "@/components/shop/ShopHeader";
import { SocialLinks } from "@/components/shop/SocialLinks";
import { QMARK } from "@/lib/placeholder";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const t = await getTenantBySlug(slug);
  if (!t) return { title: "Barbers" };
  return { title: `Our Barbers — ${t.name}`, description: `Meet the master barbers at ${t.name} and book with your favorite.`, alternates: { canonical: appUrl(`/t/${t.slug}/barbers`) } };
}

export default async function BarbersPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const t = await getTenantBySlug(slug);
  if (!t) notFound();
  // Respect the storefront's "show barbers" toggle — when off, this page is hidden
  // too (the nav link is already omitted), not just the homepage team section.
  if (!t.showBarbers) notFound();
  const barbers = await getTenantBarbers(t.id);
  const bookHref = `/t/${t.slug}/book`;

  return (
    <main className="pb-24">
      <ShopHeader eyebrow="The Team" title={<>Meet your <span className="gold-text">barbers</span></>} sub="Skilled pros who take pride in every fade, cut, and line-up." />
      <section className="relative z-10 mx-auto max-w-7xl px-5 pb-10">
        {barbers.length === 0 ? (
          <div className="mt-10 rounded-2xl border border-white/10 bg-white/[0.02] p-8 text-center text-cream/50">Our team will be listed here soon.</div>
        ) : (
          <Stagger className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" gap={0.06}>
            {barbers.map((b) => (
              <Item key={b.id}>
                <div className="lux-card flex h-full flex-col items-center p-7 text-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={b.avatarUrl || QMARK} alt={b.name} loading="lazy" className="h-28 w-28 rounded-full object-cover ring-2 ring-brass/40" />
                  <h3 className="mt-4 font-display text-xl text-cream">{b.name}</h3>
                  {b.bio && <p className="mt-2 flex-1 text-sm leading-relaxed text-cream/55">{b.bio}</p>}
                  <div className="mt-5 flex flex-col items-center gap-3">
                    <SocialLinks instagram={b.instagramHandle ? `https://instagram.com/${b.instagramHandle}` : null} facebook={b.facebookUrl} tiktok={b.tiktokUrl} x={b.xUrl} youtube={b.youtubeUrl} />
                    <Link href={bookHref} className="text-sm font-semibold text-brass hover:underline">Book with {b.name.split(" ")[0]} →</Link>
                  </div>
                </div>
              </Item>
            ))}
          </Stagger>
        )}
      </section>
    </main>
  );
}
