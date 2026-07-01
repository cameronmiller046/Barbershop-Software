import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0f0f10",
        charcoal: "#1a1a1d",
        smoke: "#232327",
        brass: "#c9a24b",
        brassDark: "#a8842f",
        cream: "#f5f1e8",
        // Classic barber-pole palette
        barber: "#c8102e",
        barberDark: "#9b0e24",
        navy: "#16324f",
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
