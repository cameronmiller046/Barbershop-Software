"use client";

import { useEffect, useState } from "react";

// Toggles the marketing site between dark-gray (default) and light. Persists the
// choice and applies a `.light` class to the `.mkt` wrapper.
export function ThemeToggle() {
  const [light, setLight] = useState(false);

  function apply(isLight: boolean) {
    document.querySelectorAll(".mkt").forEach((el) => el.classList.toggle("light", isLight));
  }

  useEffect(() => {
    const isLight = (() => { try { return localStorage.getItem("mkt-theme") === "light"; } catch { return false; } })();
    setLight(isLight);
    apply(isLight);
  }, []);

  function toggle() {
    const next = !light;
    setLight(next);
    try { localStorage.setItem("mkt-theme", next ? "light" : "dark"); } catch { /* ignore */ }
    apply(next);
  }

  return (
    <button onClick={toggle} aria-label="Toggle light/dark" title={light ? "Switch to dark" : "Switch to light"}
      className="btn-ghost px-3 py-2">
      {light ? "🌙" : "☀️"}
    </button>
  );
}
