"use client";

import { useEffect } from "react";

// Persist a small UI preference in a cookie so server components can read it and
// default to it next time (e.g. the calendar's day/week/month view). Renders
// nothing. Pair with `cookies().get(name)` on the server for the default value.
export function RememberPref({ name, value, days = 365 }: { name: string; value: string; days?: number }) {
  useEffect(() => {
    document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${days * 86400}; samesite=lax`;
  }, [name, value, days]);
  return null;
}
