import Link from "next/link";
import type { Tenant } from "@prisma/client";
import { readableOn } from "@/lib/utils";

/**
 * Wraps a tenant's public site with its brand color (injected as CSS vars so
 * .btn-primary etc. recolor automatically) plus a branded header/footer.
 */
export function TenantShell({
  tenant,
  active,
  children,
}: {
  tenant: Tenant;
  active?: string;
  children: React.ReactNode;
}) {
  const base = `/t/${tenant.slug}`;
  const nav = [
    { href: base, label: "Home", key: "home" },
    { href: `${base}/services`, label: "Services", key: "services" },
    { href: `${base}/faq`, label: "FAQ", key: "faq" },
    { href: `${base}/contact`, label: "Contact", key: "contact" },
  ];

  return (
    <div
      className="min-h-screen"
      style={
        {
          // Shop sites render on their OWN brand (neutral near-black base +
          // the shop's primaryColor accent), independent of the platform theme.
          "--brand": tenant.primaryColor,
          "--brand-fg": readableOn(tenant.primaryColor),
          background: "radial-gradient(1100px 520px at 50% -10%, #17171c 0%, #0b0b0d 60%)",
        } as React.CSSProperties
      }
    >
      <header className="border-b border-white/10">
        <div className="container-page flex h-16 items-center justify-between gap-4">
          <Link href={base} className="flex items-center gap-2">
            {tenant.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={tenant.logoUrl} alt={tenant.name} className="h-8 w-8 rounded-full object-cover" />
            ) : (
              <span
                className="grid h-8 w-8 place-items-center rounded-full font-display font-bold"
                style={{ background: tenant.primaryColor, color: readableOn(tenant.primaryColor) }}
              >
                {tenant.name.charAt(0)}
              </span>
            )}
            <span className="font-display text-lg" style={{ color: tenant.primaryColor }}>{tenant.name}</span>
          </Link>
          <nav className="hidden items-center gap-5 text-sm text-cream/70 lg:flex">
            {nav.map((n) => (
              <Link
                key={n.key}
                href={n.href}
                className={active === n.key ? "text-cream" : "hover:text-cream"}
              >
                {n.label}
              </Link>
            ))}
          </nav>
          <Link href={`${base}/book`} className="btn-primary">Book now</Link>
        </div>
      </header>

      {children}

      <footer className="mt-16 border-t border-white/10 py-10 text-sm text-cream/50">
        <div className="container-page flex flex-wrap items-center justify-between gap-4">
          <span>© {new Date().getFullYear()} {tenant.name}</span>
          <div className="flex flex-wrap gap-4">
            {nav.slice(1).map((n) => (
              <Link key={n.key} href={n.href}>{n.label}</Link>
            ))}
          </div>
          <Link href="/portal" className="text-cream/30 transition hover:text-cream/60">Powered by The Chair</Link>
        </div>
      </footer>
    </div>
  );
}
