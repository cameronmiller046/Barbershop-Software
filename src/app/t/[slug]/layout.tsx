import Link from "next/link";
import { notFound } from "next/navigation";
import { getTenantBySlug } from "@/lib/tenant";
import { readableOn, hexToRgbTriple } from "@/lib/utils";
import { shopNavLinks, bookLabelOf } from "@/lib/shop";
import { ShopNav } from "@/components/shop/ShopNav";
import { ShopFooter } from "@/components/shop/ShopFooter";

export const dynamic = "force-dynamic";

export default async function ShopLayout({ children, params }: { children: React.ReactNode; params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const tenant = await getTenantBySlug(slug);
  if (!tenant) notFound();

  // A suspended (e.g. canceled / non-paying) shop stops being publicly bookable.
  // Show a neutral notice instead of the full storefront; the booking API
  // enforces the same rule server-side.
  if (tenant.status === "SUSPENDED") {
    return (
      <div
        className="lux relative grid min-h-screen place-items-center px-6 text-center"
        style={{ "--brass": hexToRgbTriple(tenant.secondaryColor || tenant.primaryColor) } as React.CSSProperties}
      >
        <div className="lux-grain" aria-hidden />
        <div className="relative max-w-md">
          <h1 className="font-display text-2xl text-cream">{tenant.name}</h1>
          <p className="mt-3 text-cream/60">This shop isn&apos;t accepting online bookings right now. Please check back soon.</p>
        </div>
      </div>
    );
  }

  const base = `/t/${tenant.slug}`;
  const brand = tenant.primaryColor;
  const onBrand = readableOn(brand);
  const links = shopNavLinks(tenant);
  const bookHref = `${base}/book`;
  const bookLabel = bookLabelOf(tenant);
  const cta = { background: brand, color: onBrand } as React.CSSProperties;

  return (
    <div
      className="lux relative min-h-screen"
      style={{ "--brand": brand, "--brand-fg": onBrand, "--brass": hexToRgbTriple(tenant.secondaryColor || brand) } as React.CSSProperties}
    >
      <div className="lux-grain" aria-hidden />

      <ShopNav shopName={tenant.name} logoUrl={tenant.logoUrl} home={base} links={links} bookHref={bookHref} />

      {children}

      <ShopFooter tenant={tenant} links={links} bookHref={bookHref} bookLabel={bookLabel} />

      {/* Sticky mobile book bar */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-black/85 p-3 backdrop-blur lg:hidden">
        <Link href={bookHref} className="block w-full rounded-full py-3 text-center text-sm font-semibold shadow-lg" style={cta}>{bookLabel}</Link>
      </div>
    </div>
  );
}
