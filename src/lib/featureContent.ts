import type { Plan } from "@prisma/client";

// Shared feature content for the /features list + /features/[slug] detail pages.
export type FeatureIcon = "scissors" | "razor" | "comb" | "pole";

export type Feature = {
  slug: string;
  icon: FeatureIcon;
  emoji: string;
  tag: string; // short badge label
  title: string;
  blurb: string; // summary
  tier: Plan; // minimum plan that unlocks it
  tierNote?: string;
  bullets: string[];
  renders: string[]; // render keys, paired 1:1 with `sections`
  sections: { title: string; body: string }[];
};

export const TIER_META: Record<Plan, { label: string; badge: string }> = {
  SOLO: { label: "Solo", badge: "bg-emerald-500/20 text-emerald-200" },
  PRO: { label: "Pro", badge: "bg-amber-500/20 text-amber-200" },
  TEAM: { label: "Team", badge: "bg-amber-500/20 text-amber-200" },
  BARBERSHOP: { label: "Barbershop", badge: "bg-brass/20 text-brass" },
  ENTERPRISE: { label: "Enterprise", badge: "bg-flame/20 text-flame" },
};

export const FEATURES: Feature[] = [
  {
    slug: "website",
    icon: "scissors",
    emoji: "💈",
    tag: "Your storefront",
    title: "Branded shop website",
    blurb: "A professional, mobile-first website for your shop — your brand, your services, your booking link.",
    tier: "SOLO",
    bullets: ["Photo gallery", "Custom colors + logo", "QR code", "Live map & directions", "Fast on any device"],
    renders: ["gallery", "services", "booking"],
    sections: [
      { title: "Show off your best work", body: "A built-in photo gallery puts your sharpest cuts front and center — the first thing a new client sees when they land on your site." },
      { title: "Services & prices, always current", body: "List every service with its duration and price, each with a photo. Edit it all from the portal in seconds — no web developer, no hosting to manage." },
      { title: "One clear path to book", body: "Every page points to booking, so a first-time visitor turns into a booked client without friction — on their phone, at midnight, anytime." },
    ],
  },
  {
    slug: "booking",
    icon: "razor",
    emoji: "🗓️",
    tag: "Booking",
    title: "Online booking engine",
    blurb: "Customers book, reschedule, and cancel themselves — 24/7, in under a minute.",
    tier: "SOLO",
    bullets: ["Pick barber, service, time", "Email confirmations", "Self-serve manage link", "Name + phone required", "No double-bookings"],
    renders: ["booking", "calendar"],
    sections: [
      { title: "Book in under a minute", body: "Customers choose a barber, a service, and a time from a clean flow that just works on any phone — no app to download, no account to create." },
      { title: "Only real openings", body: "Availability is calculated from each barber's working hours and existing appointments in your shop's timezone — so you're never booked when you're closed or already busy." },
    ],
  },
  {
    slug: "portal",
    icon: "comb",
    emoji: "✂️",
    tag: "Run the shop",
    title: "Chair-side portal & owner reports",
    blurb: "Run the whole shop from one screen — schedules, clients, team, and CRM-style owner reports.",
    tier: "PRO",
    tierNote: "Portal basics are on every plan; owner reports & sales goals unlock on Pro.",
    bullets: ["Daily dashboard", "Client history", "Team management", "Sales goal & trend", "Per-barber earnings"],
    renders: ["dashboard", "reports", "clients"],
    sections: [
      { title: "Your day at a glance", body: "Every barber sees their own chair; managers see the whole floor. Today's appointments, this week's revenue, and upcoming bookings — all in one calm dashboard." },
      { title: "Know your numbers cold", body: "A CRM-style reports page tracks a monthly sales goal with pace, a 12-month revenue trend, and a per-barber earnings breakdown. No spreadsheets." },
      { title: "Every client on record", body: "Full visit history and private notes for each client — so you can greet a regular by name, or explain a no-show in seconds." },
    ],
  },
  {
    slug: "analytics",
    icon: "pole",
    emoji: "📊",
    tag: "Growth",
    title: "Analytics & security",
    blurb: "Consent-based, privacy-first analytics and enterprise-grade security, built in.",
    tier: "ENTERPRISE",
    bullets: ["Visitors & sources", "New vs returning", "Cookie consent", "Tenant isolation", "Audit logs"],
    renders: ["analytics"],
    sections: [
      { title: "See what drives bookings", body: "A built-in, privacy-first analytics dashboard shows where visitors come from and what turns them into bookings — with a cookie-consent banner and no personal data. Under the hood: full tenant isolation, role-based access, and audit logs." },
    ],
  },
];

export const featureBySlug = (slug: string) => FEATURES.find((f) => f.slug === slug);
