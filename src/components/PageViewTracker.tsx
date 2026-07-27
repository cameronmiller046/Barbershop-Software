"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

// One anonymous beacon per page view. If the visitor accepted cookies, we send
// a persistent visitor id (better analytics: new vs returning); otherwise the
// server falls back to a cookieless daily hash.
function persistentVid(): string | undefined {
  try {
    if (localStorage.getItem("cc") !== "accepted") return undefined;
  } catch {
    return undefined;
  }
  const m = document.cookie.match(/(?:^|;\s*)vid=([^;]+)/);
  if (m) return m[1];
  const id = Math.random().toString(36).slice(2) + Date.now().toString(36);
  document.cookie = `vid=${id}; path=/; max-age=31536000; samesite=lax`;
  return id;
}

export function PageViewTracker({ slug }: { slug?: string }) {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname) return;
    // Respect an explicit tracking opt-out: if the visitor declined, send no
    // beacon at all (previously only the persistent visitor-id was gated).
    try {
      if (localStorage.getItem("cc") === "declined") return;
    } catch { /* storage blocked — fall through to a cookieless beacon */ }
    const body = JSON.stringify({ path: pathname, ref: document.referrer || "", slug, vid: persistentVid() });
    try {
      if (typeof navigator !== "undefined" && navigator.sendBeacon) {
        navigator.sendBeacon("/api/track", new Blob([body], { type: "application/json" }));
      } else {
        fetch("/api/track", { method: "POST", body, headers: { "Content-Type": "application/json" }, keepalive: true });
      }
    } catch {
      /* best-effort */
    }
  }, [pathname, slug]);

  return null;
}
