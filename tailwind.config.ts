import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Surface + text tokens are CSS-variable driven so a `.theme-light`
        // wrapper can flip the marketing site to a light palette while the
        // portal/shop stay dark. Defaults (in globals :root) = the dark values.
        ink: "rgb(var(--ink) / <alpha-value>)",
        charcoal: "rgb(var(--charcoal) / <alpha-value>)",
        smoke: "rgb(var(--smoke) / <alpha-value>)",
        cream: "rgb(var(--cream) / <alpha-value>)",
        // `brass` = the themeable accent (per-tenant brand, or light-theme brass).
        brass: "rgb(var(--brass) / <alpha-value>)",
        brassDark: "#d9cfb4",
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
        script: ["var(--font-script)", "cursive"],
      },
    },
  },
  plugins: [],
};

export default config;
