import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Navy base (was near-black)
        ink: "#0d1b2e",
        charcoal: "#15293f",
        smoke: "#1e3a58",
        // `brass` = readable light ivory for headings/accent text on the dark
        // navy base (red text on navy failed contrast). Fills use `barber`.
        brass: "#f0ead9",
        brassDark: "#d9cfb4",
        cream: "#f5f1e8",
        // Barber-pole palette: deep red for fills, a lighter "flame" red that
        // stays readable as text on navy, and navy-blue for stripe accents.
        barber: "#d1233a",
        barberDark: "#a81b2e",
        flame: "#ff7d6e",
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
