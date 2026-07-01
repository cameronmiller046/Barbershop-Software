import type { Plan } from "@prisma/client";

// Shared feature content for the /features list + /features/[slug] detail pages.
export type FeatureIcon = "scissors" | "razor" | "comb" | "pole";

export type Feature = {
  slug: string;
  icon: FeatureIcon;
  emoji: string;
  title: string;
  blurb: string;
  tier: Plan; // minimum plan that unlocks it
  tierNote?: string;
  intro: string[]; // detail-page paragraphs
  bullets: string[];
  renders: string[]; // render keys shown on the detail page
};

export const TIER_META: Record<Plan, { label: string; badge: string }> = {
  SOLO: { label: "Solo", badge: "bg-emerald-500/20 text-emerald-200" },
  PRO: { label: "Pro", badge: "bg-amber-500/20 text-amber-200" },
  ENTERPRISE: { label: "Enterprise", badge: "bg-flame/20 text-flame" },
};

export const FEATURES: Feature[] = [
  {
    slug: "website",
    icon: "scissors",
    emoji: "💈",
    title: "Branded shop website",
    blurb: "A professional, mobile-first website for your shop — your brand, your services, your booking link.",
    tier: "SOLO",
    intro: [
      "Every shop gets its own beautiful website the moment it's onboarded — no designer, no web host, no code.",
      "Your logo, your brand colors, your services, and a photo gallery of your work — all editable from the portal in seconds. The whole site is fast and looks sharp on phones, tablets, and desktops.",
    ],
    bullets: [
      "Home, Services, FAQ, and Contact pages",
      "Photo gallery of your best cuts",
      "Custom brand colors + logo, changeable anytime",
      "Printable QR code that links straight to booking",
      "Live map + one-tap directions on the contact page",
    ],
    renders: ["gallery", "services", "booking"],
  },
  {
    slug: "booking",
    icon: "razor",
    emoji: "🗓️",
    title: "Online booking engine",
    blurb: "Customers book, reschedule, and cancel themselves — 24/7, in under a minute.",
    tier: "SOLO",
    intro: [
      "Stop playing phone tag. Customers pick a barber, a service, and a time from a clean calendar — day or night.",
      "Availability is calculated from each barber's real working hours in your shop's timezone, so you never get booked when you're closed or double-booked. Confirmations go out by email, and everyone gets a self-serve link to manage their appointment.",
    ],
    bullets: [
      "Pick a barber, service, and time on a real calendar",
      "Per-barber availability in your shop's timezone",
      "Requires name + phone to cut down on no-shows",
      "Email confirmations + self-serve manage link",
      "Staff can reschedule or cancel with a reason",
    ],
    renders: ["booking", "calendar"],
  },
  {
    slug: "portal",
    icon: "comb",
    emoji: "✂️",
    title: "Chair-side portal & owner reports",
    blurb: "Run the whole shop from one screen — schedules, clients, team, and CRM-style owner reports.",
    tier: "PRO",
    tierNote: "Portal basics are on every plan; owner reports & sales goals unlock on Pro.",
    intro: [
      "Every barber sees their day at a glance; managers see the whole floor. Clients, notes, services, and the team — all in one place.",
      "Owners get a CRM-style reports dashboard: a monthly sales goal with pace tracking, a 12-month revenue trend, and a per-barber earnings breakdown — so you always know exactly how the shop is doing.",
    ],
    bullets: [
      "Daily dashboard + upcoming appointments",
      "Client list with full history (find a no-show in seconds)",
      "Service management, pricing, and photos",
      "Owner reports: monthly goal, pace & 12-month trend",
      "Per-barber earnings breakdown",
    ],
    renders: ["dashboard", "reports", "clients"],
  },
  {
    slug: "analytics",
    icon: "pole",
    emoji: "📊",
    title: "Analytics & security",
    blurb: "Consent-based, privacy-first analytics and enterprise-grade security, built in.",
    tier: "ENTERPRISE",
    intro: [
      "Understand exactly where your visitors come from and what turns them into bookings — with a built-in analytics dashboard.",
      "It's privacy-first: a cookie-consent banner, no personal data, and new-vs-returning visitor counts. Under the hood, every shop's data is fully isolated with role-based access, audit logs, rate limiting, and input validation.",
    ],
    bullets: [
      "Visitors, sources, top shops & pages",
      "Cookie-consent banner + new-vs-returning visitors",
      "Full tenant isolation & role-based access",
      "Audit logs for every sensitive action",
      "Rate limiting and input validation",
    ],
    renders: ["analytics"],
  },
];

export const featureBySlug = (slug: string) => FEATURES.find((f) => f.slug === slug);
