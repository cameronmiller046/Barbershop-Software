import type { Plan } from "@prisma/client";

// Single source of truth for what each plan tier costs and unlocks. Enforced
// server-side (see planLimits usage in the portal) and surfaced in the UI.
//
// Tiers shown to new customers: SOLO ($29) · TEAM · BARBERSHOP · ENTERPRISE.
// PRO is a legacy tier kept so existing/demo shops keep working; it is not
// offered at signup.
export type PlanLimits = {
  label: string;
  price: string; // display price, e.g. "Free", "$49", "Custom"
  priceCents: number; // monthly price in cents (0 for free / contact-sales tiers)
  paid: boolean; // requires a live Stripe subscription
  offeredAtSignup: boolean; // shown as a self-serve option on /signup
  contactSales: boolean; // Enterprise — routes to /contact instead of checkout
  // Env var holding this tier's Stripe Price id (paid tiers).
  stripePriceEnv?: string;
  trialDays: number; // free-trial length applied at checkout (0 = charge immediately)
  includedBarbers: number; // seats bundled into the base price
  maxBarbers: number; // chairs (hard cap today; metered extra seats are future work)
  reports: boolean; // owner reports & sales goals
  reviews: boolean; // reviews & photo gallery
  noShowTracking: boolean;
  multiLocation: boolean;
  prioritySupport: boolean;
};

export const PLAN_LIMITS: Record<Plan, PlanLimits> = {
  // Solo is a $29/mo paid entry tier (1 barber), with the standard 14-day trial.
  // The actual charge amount is set by the Stripe Price behind STRIPE_PRICE_SOLO —
  // that Price must be $29/mo for checkout to match this display.
  SOLO: {
    label: "Solo", price: "$29", priceCents: 2900, paid: true, offeredAtSignup: true, contactSales: false,
    stripePriceEnv: "STRIPE_PRICE_SOLO", trialDays: 14,
    includedBarbers: 1, maxBarbers: 1,
    reports: false, reviews: false, noShowTracking: false, multiLocation: false, prioritySupport: false,
  },
  // Legacy tier — same capabilities as TEAM, retained for existing/demo shops.
  PRO: {
    label: "Pro", price: "$49", priceCents: 4900, paid: false, offeredAtSignup: false, contactSales: false,
    trialDays: 14,
    includedBarbers: 6, maxBarbers: 6,
    reports: true, reviews: true, noShowTracking: true, multiLocation: false, prioritySupport: false,
  },
  TEAM: {
    label: "Team", price: "$49", priceCents: 4900, paid: true, offeredAtSignup: true, contactSales: false,
    stripePriceEnv: "STRIPE_PRICE_TEAM", trialDays: 14,
    includedBarbers: 3, maxBarbers: 3,
    reports: true, reviews: true, noShowTracking: true, multiLocation: false, prioritySupport: false,
  },
  BARBERSHOP: {
    label: "Barbershop", price: "$129", priceCents: 12900, paid: true, offeredAtSignup: true, contactSales: false,
    stripePriceEnv: "STRIPE_PRICE_BARBERSHOP", trialDays: 14,
    includedBarbers: 8, maxBarbers: 8,
    reports: true, reviews: true, noShowTracking: true, multiLocation: false, prioritySupport: true,
  },
  ENTERPRISE: {
    label: "Enterprise", price: "Custom", priceCents: 0, paid: false, offeredAtSignup: true, contactSales: true,
    trialDays: 0,
    includedBarbers: Infinity, maxBarbers: Infinity,
    reports: true, reviews: true, noShowTracking: true, multiLocation: true, prioritySupport: true,
  },
};

export function planLimits(plan: Plan): PlanLimits {
  return PLAN_LIMITS[plan] ?? PLAN_LIMITS.SOLO;
}

// A parsed plan key that is safe to accept from a URL/query (?plan=team).
export function parsePlanKey(v: string | null | undefined): Plan | null {
  if (!v) return null;
  const up = v.toUpperCase();
  return up in PLAN_LIMITS ? (up as Plan) : null;
}

// Whether starting on this plan requires sending the buyer to Stripe checkout.
export function isPaidPlan(plan: Plan): boolean {
  return planLimits(plan).paid;
}

// Resolve the configured Stripe Price id for a paid plan (from env).
// Returns null for free / contact-sales tiers or when the env var is unset.
export function stripePriceId(plan: Plan): string | null {
  const env = planLimits(plan).stripePriceEnv;
  if (!env) return null;
  return process.env[env]?.trim() || null;
}
