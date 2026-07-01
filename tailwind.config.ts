import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Neutral near-black base (no blue).
        ink: "#0f0f10",
        charcoal: "#17171b",
        smoke: "#26262b",
        // `brass` = the themeable accent. Driven by --brass so each tenant's
        // portal/site can recolor every accent to their brand (ivory by
        // default on the platform). Uses rgb() so opacity utilities work.
        brass: "rgb(var(--brass) / <alpha-value>)",
        brassDark: "#d9cfb4",
        cream: "#f5f1e8",
        // Barber-red fills + a lighter, readable "flame" red for accent text.
        barber: "#d1233a",
        barberDark: "#a81b2e",
        flame: "#ff7d6e",
        // neutral (kept for legacy usages; no longer blue)
        navy: "#2a2a30",
      },
      fontFamily: {
        display: ["var(--font-display)", "Georgia", "serif"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
