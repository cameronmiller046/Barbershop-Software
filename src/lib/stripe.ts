import Stripe from "stripe";
import type { Plan, SubscriptionStatus } from "@prisma/client";
import { planLimits, stripePriceId } from "@/lib/plans";
import { appUrl } from "@/lib/utils";

// ─────────────────────────────────────────────────────────────────────────────
// Stripe billing integration.
//
// Buyers pay on Stripe's HOSTED Checkout page, so no card data ever touches this
// app. We create a Checkout Session in subscription mode for a plan's Price;
// Stripe creates the Customer + Subscription and notifies us via webhook. The
// tenant is correlated back to Stripe via metadata (tenantId) — no guessing.
// ─────────────────────────────────────────────────────────────────────────────

const SECRET_KEY = process.env.STRIPE_SECRET_KEY?.trim() || "";

/** True when the server has a Stripe secret key configured. */
export function stripeConfigured(): boolean {
  return Boolean(SECRET_KEY);
}

let _stripe: Stripe | null = null;
export function stripe(): Stripe {
  if (!SECRET_KEY) throw new Error("STRIPE_SECRET_KEY is not set.");
  // apiVersion omitted → the SDK uses its pinned default, which matches these types.
  if (!_stripe) _stripe = new Stripe(SECRET_KEY);
  return _stripe;
}

// Free-trial length for paid plans (matches the "14-Day Free Trial" marketing).
const TRIAL_DAYS = 14;

/**
 * Create a Stripe-hosted Checkout Session that subscribes the buyer to a paid
 * plan. Returns the URL to redirect the owner to. Throws if the plan isn't a
 * paid tier, Stripe isn't configured, or the plan's Price env var is missing.
 */
export async function createSubscriptionCheckoutLink(input: {
  plan: Plan;
  tenantId: string;
  businessName: string;
  email: string;
}): Promise<string> {
  const limits = planLimits(input.plan);
  if (!limits.paid) throw new Error(`Plan ${input.plan} is not a paid subscription tier.`);
  if (!stripeConfigured()) throw new Error("Stripe billing is not configured on the server.");

  const priceId = stripePriceId(input.plan);
  if (!priceId) {
    throw new Error(`No Stripe Price id configured for ${input.plan} (env ${limits.stripePriceEnv}).`);
  }

  const session = await stripe().checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    customer_email: input.email,
    // tenantId on both the Session and the Subscription so any webhook can
    // resolve the tenant without an email lookup.
    metadata: { tenantId: input.tenantId, plan: input.plan },
    subscription_data: {
      trial_period_days: TRIAL_DAYS,
      metadata: { tenantId: input.tenantId, plan: input.plan },
    },
    success_url: appUrl(`/signup/success?tenant=${input.tenantId}&session_id={CHECKOUT_SESSION_ID}`),
    cancel_url: appUrl("/portal/billing?canceled=1"),
    allow_promotion_codes: true,
  });

  if (!session.url) throw new Error("Stripe did not return a checkout URL.");
  return session.url;
}

/** Create a Stripe Billing Customer Portal session (manage/cancel/update card). */
export async function createBillingPortalUrl(customerId: string, returnPath = "/portal/billing"): Promise<string> {
  const session = await stripe().billingPortal.sessions.create({
    customer: customerId,
    return_url: appUrl(returnPath),
  });
  return session.url;
}

/** Map a Stripe subscription status to our SubscriptionStatus enum. */
export function mapStripeStatus(status: Stripe.Subscription.Status | string | undefined | null): SubscriptionStatus {
  switch (status) {
    case "active":
      return "ACTIVE";
    case "trialing":
      return "TRIALING";
    case "past_due":
    case "unpaid":
      return "PAST_DUE";
    case "canceled":
    case "incomplete_expired":
      return "CANCELED";
    case "incomplete":
      return "PENDING";
    default:
      return "PENDING";
  }
}

/**
 * Whether a subscription status should grant full portal access. Trialing and
 * active shops are "live"; everything else is gated to the billing page.
 */
export function isLiveStatus(status: SubscriptionStatus): boolean {
  return status === "ACTIVE" || status === "TRIALING";
}

/** Retrieve a Checkout Session (used to reconcile immediately on the success page). */
export async function retrieveCheckoutSession(sessionId: string): Promise<Stripe.Checkout.Session | null> {
  try {
    return await stripe().checkout.sessions.retrieve(sessionId, { expand: ["subscription"] });
  } catch {
    return null;
  }
}

/** Retrieve a subscription by id (used to reconcile from a stored subscription id). */
export async function retrieveSubscription(subscriptionId: string): Promise<Stripe.Subscription | null> {
  try {
    return await stripe().subscriptions.retrieve(subscriptionId);
  } catch {
    return null;
  }
}

/**
 * Verify + parse a Stripe webhook. Returns the typed event, or null if the
 * signature is invalid / the secret is unset.
 */
export function constructWebhookEvent(rawBody: string, signature: string | null): Stripe.Event | null {
  const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!secret || !signature) return null;
  try {
    return stripe().webhooks.constructEvent(rawBody, signature, secret);
  } catch {
    return null;
  }
}

/** The unix seconds when the current period ends → a Date, if present. */
export function periodEnd(sub: Stripe.Subscription | null | undefined): Date | null {
  const end = (sub as { current_period_end?: number } | null | undefined)?.current_period_end;
  return typeof end === "number" ? new Date(end * 1000) : null;
}
