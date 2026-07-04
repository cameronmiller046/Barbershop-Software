import type { Metadata } from "next";
import { Inter, Playfair_Display, Dancing_Script } from "next/font/google";
import "./globals.css";
import { PublicAnalytics } from "@/components/PublicAnalytics";

const sans = Inter({ subsets: ["latin"], variable: "--font-sans" });
const display = Playfair_Display({ subsets: ["latin"], variable: "--font-display" });
const script = Dancing_Script({ subsets: ["latin"], weight: ["600", "700"], variable: "--font-script" });

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: {
    default: "The Chair — Barbershop booking software 💈",
    template: "%s · The Chair",
  },
  description:
    "Barbershop booking software: a branded website, online booking + QR, owner reports, and a chair-side portal. Flat monthly price, no per-booking fees. Start free.",
  keywords: ["barbershop software", "barber booking software", "salon booking", "online booking for barbers", "barbershop appointment app", "barber POS"],
  openGraph: {
    type: "website",
    siteName: "The Chair",
    title: "The Chair — Barbershop booking software",
    description: "Branded website, online booking, and owner reports for barbershops. Flat price, no per-booking fees.",
    url: APP_URL,
  },
  twitter: { card: "summary_large_image", title: "The Chair — Barbershop booking software", description: "Booking, portal, and reports for barbershops. Start free." },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${display.variable} ${script.variable}`}>
      <body className="font-sans text-cream antialiased">
        {children}
        <PublicAnalytics />
      </body>
    </html>
  );
}
