"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Keeps a server-rendered portal page live: re-pulls fresh data on an interval
// (so appointments booked elsewhere — public site, kiosk, another device — show
// up without a manual refresh) and immediately when the tab regains focus.
// router.refresh() is a soft refresh: it re-runs the server components only and
// preserves scroll position, form inputs, and other client state.
export function AutoRefresh({ intervalMs = 10000 }: { intervalMs?: number }) {
  const router = useRouter();

  useEffect(() => {
    const tick = () => {
      if (document.visibilityState === "visible") router.refresh();
    };
    const id = setInterval(tick, intervalMs);
    document.addEventListener("visibilitychange", tick);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [router, intervalMs]);

  return null;
}
