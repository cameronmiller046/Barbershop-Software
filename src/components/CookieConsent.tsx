"use client";

import { useEffect, useState } from "react";

// Bottom cookie-consent banner. Stores the choice in localStorage + a `cc`
// cookie; tracking uses a persistent visitor cookie only after "Accept".
export function CookieConsent() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    try { if (!localStorage.getItem("cc")) setShow(true); } catch { /* ignore */ }
  }, []);

  function choose(v: "accepted" | "declined") {
    try { localStorage.setItem("cc", v); } catch { /* ignore */ }
    document.cookie = `cc=${v === "accepted" ? "1" : "0"}; path=/; max-age=31536000; samesite=lax`;
    setShow(false);
    window.dispatchEvent(new Event("cc-change"));
  }

  if (!show) return null;
  return (
    <div className="fixed inset-x-0 bottom-0 z-[60] p-3 sm:p-4">
      <div className="mx-auto flex max-w-3xl flex-col items-center gap-3 rounded-2xl border border-white/10 bg-charcoal/95 p-4 shadow-2xl backdrop-blur sm:flex-row sm:justify-between">
        <p className="text-sm text-cream/80">
          🍪 We use cookies to measure traffic and improve your experience. You&apos;re in control.
        </p>
        <div className="flex shrink-0 gap-2">
          <button onClick={() => choose("declined")} className="btn-ghost px-4 py-2 text-sm">Decline</button>
          <button onClick={() => choose("accepted")} className="btn-primary px-4 py-2 text-sm">Accept 🍪</button>
        </div>
      </div>
    </div>
  );
}
