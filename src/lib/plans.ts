import type { Plan } from "@prisma/client";

// Single source of truth for what each plan tier costs and unlocks. Enforced
// server-side (see planLimits usage in the portal) and surfaced in the UI.
//
// Tiers shown to new customers: SOLO (free) · TEAM · BARBERSHOP · ENTERPRISE.
// PRO is a legacy tier kept so existing/demo shops keep working; it is not
// offered at signup.
export type PlanLimits = {
  label: string;
  price: string; // display price, e.g. "Free", "$49", "Custom"
  priceCents: number; // monthly price in cents (0 for free / contact-sales tiers)
  paid: boolean; // requires a live Square subscription
  offeredAtSignup: boolean; // shown as a self-serve option on /signup
  contactSales: boolean; // Enterprise — routes to /contact instead of checkout
  // Env var holding this tier's Square subscription-plan-variation id (paid tiers).
  squareVariationEnv?: string;
  includedBarbers: number; // seats bundled into the base price
  maxBarbers: number; // chairs (hard cap today; metered extra seats are future work)
  reports: boolean; // owner reports & sales goals
  reviews: boolean; // reviews & photo gallery
  noShowTracking: boolean;
  multiLocation: boolean;
  prioritySupport: boolean;
};

export const PLAN_LIMITS: Record<Plan, PlanLimits> = {
  SOLO: {
    label: "Solo", price: "Free", priceCents: 0, paid: false, offeredAtSignup: true, contactSales: false,
    includedBarbers: 1, maxBarbers: 1,
    reports: false, reviews: false, noShowTracking: false, multiLocation: false, prioritySupport: false,
  },
  // Legacy tier — same capabilities as TEAM, retained for existing/demo shops.
  PRO: {
    label: "Pro", price: "$49", priceCents: 4900, paid: false, offeredAtSignup: false, contactSales: false,
    includedBarbers: 6, maxBarbers: 6,
    reports: true, reviews: true, noShowTracking: true, multiLocation: false, prioritySupport: false,
  },
  TEAM: {
    label: "Team", price: "$49", priceCents: 4900, paid: true, offeredAtSignup: true, contactSales: false,
    squareVariationEnv: "SQUARE_PLAN_VARIATION_TEAM",
    includedBarbers: 3, maxBarbers: 3,
    reports: true, reviews: true, noShowTracking: true, multiLocation: false, prioritySupport: false,
  },
  BARBERSHOP: {
    label: "Barbershop", price: "$129", priceCents: 12900, paid: true, offeredAtSignup: true, contactSales: false,
    squareVariationEnv: "SQUARE_PLAN_VARIATION_BARBERSHOP",
    includedBarbers: 8, maxBarbers: 8,
    reports: true, reviews: true, noShowTracking: true, multiLocation: false, prioritySupport: true,
  },
  ENTERPRISE: {
    label: "Enterprise", price: "Custom", priceCents: 0, paid: false, offeredAtSignup: true, contactSales: true,
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

// Whether starting on this plan requires sending the buyer to Square checkout.
export function isPaidPlan(plan: Plan): boolean {
  return planLimits(plan).paid;
}

// Resolve the configured Square plan-variation id for a paid plan (from env).
// Returns null for free / contact-sales tiers or when the env var is unset.
export function squareVariationId(plan: Plan): string | null {
  const env = planLimits(plan).squareVariationEnv;
  if (!env) return null;
  return process.env[env]?.trim() || null;
}
