"use client";

import { usePathname } from "next/navigation";
import { PageViewTracker } from "./PageViewTracker";
import { CookieConsent } from "./CookieConsent";

// Site-wide analytics + cookie banner, but only on PUBLIC pages (never the
// internal portal/admin/login). Tracks marketing pages and shop sites.
export function PublicAnalytics() {
  const pathname = usePathname() || "/";
  if (/^\/(portal|admin|login|api)(\/|$)/.test(pathname)) return null;
  const slug = pathname.startsWith("/t/") ? pathname.split("/")[2] : undefined;
  return (
    <>
      <PageViewTracker slug={slug} />
      <CookieConsent />
    </>
  );
}
