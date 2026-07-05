import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTenantBySlug } from "@/lib/tenant";
import { appUrl } from "@/lib/utils";
import { Reveal } from "@/components/home/motion";
import { Icon } from "@/components/home/icons";
import { ShopHeader } from "@/components/shop/ShopHeader";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const t = await getTenantBySlug(slug);
  if (!t) return { title: "About" };
  return { title: `About — ${t.name}`, description: t.description?.slice(0, 200) || `About ${t.name}.`, alternates: { canonical: appUrl(`/t/${t.slug}/about`) } };
}

export default async function AboutPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const t = await getTenantBySlug(slug);
  if (!t) notFound();
  const base = `/t/${t.slug}`;
  const cta = { background: "var(--brand)", color: "var(--brand-fg)" } as React.CSSProperties;

  return (
    <main className="pb-24">
      <ShopHeader eyebrow="About Us" title={<>Welcome to <span className="gold-text">{t.name}</span></>} />
      <section className="relative z-10 mx-auto max-w-3xl px-5 py-12">
        {t.description ? (
          <Reveal><p className="whitespace-pre-line text-center text-lg leading-relaxed text-cream/70">{t.description}</p></Reveal>
        ) : (
          <p className="text-center text-cream/50">{t.tagline || `Precision cuts and classic barbering at ${t.name}.`}</p>
        )}
        <Reveal className="mt-10 flex flex-wrap justify-center gap-3">
          <Link href={`${base}/book`} className="inline-flex items-center gap-2 rounded-full px-7 py-3.5 text-base font-semibold shadow-lg transition hover:brightness-105" style={cta}>Book an appointment <Icon.arrow className="h-4 w-4" /></Link>
          <Link href={`${base}/contact`} className="btn-outline-gold text-base">Visit us</Link>
        </Reveal>
      </section>
    </main>
  );
}
