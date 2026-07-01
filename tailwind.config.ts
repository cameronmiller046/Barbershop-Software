import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Navy base (was near-black)
        ink: "#0c1a2b",
        charcoal: "#12273e",
        smoke: "#1d3a5c",
        // Barber-red primary accent (was gold). Kept the `brass` name so the
        // whole app re-skins from these tokens without per-component edits.
        brass: "#d1233a",
        brassDark: "#a81b2e",
        cream: "#f5f1e8",
        // Classic barber-pole palette
        barber: "#d1233a",
        barberDark: "#a81b2e",
        navy: "#1f4e79",
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
