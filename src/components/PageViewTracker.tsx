"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

// Fires one anonymous beacon per page view on the public shop sites. No cookies,
// no localStorage — just the path + referrer. The server hashes the visitor
// with a daily-rotating salt; nothing personal leaves the browser.
export function PageViewTracker({ slug }: { slug?: string }) {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname) return;
    const body = JSON.stringify({ path: pathname, ref: document.referrer || "", slug });
    try {
      if (typeof navigator !== "undefined" && navigator.sendBeacon) {
        navigator.sendBeacon("/api/track", new Blob([body], { type: "application/json" }));
      } else {
        fetch("/api/track", { method: "POST", body, headers: { "Content-Type": "application/json" }, keepalive: true });
      }
    } catch {
      /* analytics is best-effort */
    }
  }, [pathname, slug]);

  return null;
}
