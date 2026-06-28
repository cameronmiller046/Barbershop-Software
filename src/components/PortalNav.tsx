"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { classNames } from "@/lib/utils";

const LINKS = [
  { href: "/portal", label: "Dashboard", exact: true },
  { href: "/portal/appointments", label: "Appointments" },
  { href: "/portal/clients", label: "Clients" },
  { href: "/portal/services", label: "Services" },
  { href: "/portal/social", label: "Social planner" },
  { href: "/portal/team", label: "Team", ownerOnly: true },
  { href: "/portal/settings", label: "Settings", ownerOnly: true },
];

export function PortalNav({ isOwner, siteUrl }: { isOwner: boolean; siteUrl: string }) {
  const pathname = usePathname();
  return (
    <nav className="space-y-1">
      {LINKS.filter((l) => !l.ownerOnly || isOwner).map((l) => {
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
