import type { Plan } from "@prisma/client";

// What each plan tier unlocks. Enforced server-side (and surfaced in the UI).
export type PlanLimits = {
  label: string;
  price: string;
  maxBarbers: number; // chairs
  reports: boolean; // owner reports & sales goals
  reviews: boolean; // reviews & photo gallery
  noShowTracking: boolean;
  multiLocation: boolean;
  prioritySupport: boolean;
};

export const PLAN_LIMITS: Record<Plan, PlanLimits> = {
  SOLO: {
    label: "Solo", price: "$0",
    maxBarbers: 1, reports: false, reviews: false, noShowTracking: false, multiLocation: false, prioritySupport: false,
  },
  PRO: {
    label: "Pro", price: "$39",
    maxBarbers: 6, reports: true, reviews: true, noShowTracking: true, multiLocation: false, prioritySupport: false,
  },
  ENTERPRISE: {
    label: "Enterprise", price: "$129",
    maxBarbers: Infinity, reports: true, reviews: true, noShowTracking: true, multiLocation: true, prioritySupport: true,
  },
};

export function planLimits(plan: Plan): PlanLimits {
  return PLAN_LIMITS[plan] ?? PLAN_LIMITS.SOLO;
}
