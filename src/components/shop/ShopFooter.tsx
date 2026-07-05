import Link from "next/link";
import type { Tenant } from "@prisma/client";
import { appUrl, readableOn } from "@/lib/utils";
import type { NavLink } from "@/components/shop/ShopNav";
import { SocialLinks } from "@/components/shop/SocialLinks";

export function ShopFooter({ tenant, links, bookHref, bookLabel }: { tenant: Tenant; links: NavLink[]; bookHref: string; bookLabel: string }) {
  const cta = { background: tenant.primaryColor, color: readableOn(tenant.primaryColor) } as React.CSSProperties;

  return (
    <footer className="relative z-10 border-t border-white/10 bg-[#070608]">
      <div className="mx-auto max-w-7xl px-5 py-14">
        <div className="flex flex-wrap items-start justify-between gap-8">
          <div className="max-w-sm">
            <Link href={links[0]?.href ?? "/"} className="flex items-center gap-2.5">
              {tenant.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={tenant.logoUrl} alt={tenant.name} className="h-9 w-9 rounded-full object-cover" />
              ) : (
                <span className="grid h-9 w-9 place-items-center rounded-full font-display font-bold" style={cta}>{tenant.name.charAt(0)}</span>
              )}
              <span className="font-display text-lg text-cream">{tenant.name}</span>
            </Link>
            {tenant.tagline && <p className="mt-3 text-sm text-cream/50">{tenant.tagline}</p>}
            <Link href={bookHref} className="mt-5 inline-flex rounded-full px-5 py-2.5 text-sm font-semibold" style={cta}>{bookLabel}</Link>
            <SocialLinks className="mt-5" instagram={tenant.instagramUrl} facebook={tenant.facebookUrl} tiktok={tenant.tiktokUrl} x={tenant.xUrl} youtube={tenant.youtubeUrl} website={tenant.website} />
          </div>
          <div className="grid grid-cols-2 gap-8 text-sm sm:grid-cols-3">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-cream/40">Explore</div>
              <ul className="mt-3 space-y-2">{links.map((n) => <li key={n.href}><Link href={n.href} className="text-cream/60 hover:text-brass">{n.label}</Link></li>)}</ul>
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-cream/40">Visit</div>
              <ul className="mt-3 space-y-2 text-cream/60">
                {tenant.address && <li>{tenant.address}</li>}
                {tenant.phone && <li><a href={`tel:${tenant.phone}`} className="hover:text-brass">{tenant.phone}</a></li>}
                {tenant.email && <li><a href={`mailto:${tenant.email}`} className="hover:text-brass">{tenant.email}</a></li>}
              </ul>
            </div>
          </div>
        </div>
        <div className="mt-12 flex flex-col items-center justify-between gap-3 border-t border-white/10 pt-6 text-xs text-cream/40 sm:flex-row">
          <span>© {new Date().getFullYear()} {tenant.name}. All rights reserved.</span>
          <a href={appUrl("/")} className="text-cream/40 hover:text-brass">Powered by The Chair</a>
        </div>
      </div>
    </footer>
  );
}
