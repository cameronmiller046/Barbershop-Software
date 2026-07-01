"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { classNames } from "@/lib/utils";
import type { PermKey } from "@/lib/permissions";

const LINKS: { href: string; label: string; exact?: boolean; perm?: PermKey }[] = [
  { href: "/portal", label: "Dashboard", exact: true },
  { href: "/portal/appointments", label: "Appointments" },
  { href: "/portal/reports", label: "Reports", perm: "shop.viewAll" },
  { href: "/portal/clients", label: "Clients", perm: "shop.clients" },
  { href: "/portal/services", label: "Services", perm: "shop.services" },
  { href: "/portal/team", label: "Team", perm: "shop.team" },
  { href: "/portal/booking", label: "Booking", perm: "shop.settings" },
  { href: "/portal/settings", label: "Settings", perm: "shop.settings" },
  { href: "/portal/account", label: "My account" },
];

export function PortalNav({ perms, siteUrl, reports = true }: { perms: Record<string, boolean>; siteUrl: string; reports?: boolean }) {
  const pathname = usePathname();
  return (
    <nav className="space-y-1">
      {LINKS.filter((l) => (!l.perm || perms[l.perm]) && (l.href !== "/portal/reports" || reports)).map((l) => {
        const active = l.exact ? pathname === l.href : pathname.startsWith(l.href);
        return (
          <Link key={l.href} href={l.href}
            className={classNames(
              "block rounded-lg px-3 py-2 text-sm transition",
              active ? "bg-brass/15 text-brass" : "text-cream/70 hover:bg-white/5",
            )}>
            {l.label}
          </Link>
        );
      })}
      <a href={siteUrl} target="_blank" rel="noreferrer"
        className="mt-3 block rounded-lg px-3 py-2 text-sm text-cream/40 hover:bg-white/5">
        View shop site ↗
      </a>
    </nav>
  );
}
