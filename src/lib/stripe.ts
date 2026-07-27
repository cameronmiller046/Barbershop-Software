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
      // Per-plan trial; 0 means charge immediately (no trial).
      ...(limits.trialDays > 0 ? { trial_period_days: limits.trialDays } : {}),
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

// ── Custom on-page checkout (Payment Element) ────────────────────────────────
// Instead of a hosted redirect, we create an incomplete subscription and hand
// the browser a client secret to confirm with the Payment Element. Immediate
// charges (no trial) confirm a PaymentIntent via the invoice's confirmation
// secret; trial plans confirm a SetupIntent (pending_setup_intent).

/** The Stripe publishable key for the browser. */
export function stripePublishableKey(): string {
  return process.env.STRIPE_PUBLISHABLE_KEY?.trim() || "";
}

export type SubscriptionIntent = { clientSecret: string; mode: "payment" | "setup" };

const SUB_EXPAND = ["latest_invoice.confirmation_secret", "pending_setup_intent"];

// Pull the confirm secret from an (expanded) subscription.
function readIntent(sub: Stripe.Subscription): SubscriptionIntent | null {
  const inv = typeof sub.latest_invoice === "object" && sub.latest_invoice ? sub.latest_invoice : null;
  const conf = inv?.confirmation_secret?.client_secret;
  if (conf) return { clientSecret: conf, mode: "payment" };
  const psi = typeof sub.pending_setup_intent === "object" && sub.pending_setup_intent ? sub.pending_setup_intent : null;
  if (psi?.client_secret) return { clientSecret: psi.client_secret, mode: "setup" };
  return null;
}

/** Ensure a Stripe Customer exists for a tenant; returns its id. */
export async function ensureStripeCustomer(input: {
  existingId?: string | null; email: string; name: string; tenantId: string;
}): Promise<string> {
  if (input.existingId) return input.existingId;
  const c = await stripe().customers.create({
    email: input.email || undefined,
    name: input.name,
    metadata: { tenantId: input.tenantId },
  });
  return c.id;
}

/** Create an incomplete subscription and return its client secret for the Payment Element. */
export async function createIncompleteSubscription(input: {
  customerId: string; priceId: string; trialDays: number; tenantId: string; plan: string;
}): Promise<{ subscriptionId: string } & SubscriptionIntent> {
  const sub = await stripe().subscriptions.create({
    customer: input.customerId,
    items: [{ price: input.priceId }],
    ...(input.trialDays > 0 ? { trial_period_days: input.trialDays } : {}),
    payment_behavior: "default_incomplete",
    payment_settings: { save_default_payment_method: "on_subscription" },
    billing_mode: { type: "flexible" },
    metadata: { tenantId: input.tenantId, plan: input.plan },
    expand: SUB_EXPAND,
  });
  const intent = readIntent(sub);
  if (!intent) throw new Error("Stripe did not return a client secret for the subscription.");
  return { subscriptionId: sub.id, ...intent };
}

/** Retrieve an existing subscription's status + price + confirm secret (for reuse). */
export async function inspectSubscription(subscriptionId: string): Promise<{
  status: SubscriptionStatus; priceId: string | null; intent: SubscriptionIntent | null;
} | null> {
  try {
    const sub = await stripe().subscriptions.retrieve(subscriptionId, { expand: SUB_EXPAND });
    const live = sub.status === "active" || sub.status === "trialing";
    return {
      status: mapStripeStatus(sub.status),
      priceId: sub.items.data[0]?.price?.id ?? null,
      intent: live ? null : readIntent(sub),
    };
  } catch {
    return null;
  }
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
  // Newer API versions surface current_period_end on the subscription item.
  const top = (sub as { current_period_end?: number } | null | undefined)?.current_period_end;
  if (typeof top === "number") return new Date(top * 1000);
  const item = sub?.items?.data?.[0] as { current_period_end?: number } | undefined;
  if (typeof item?.current_period_end === "number") return new Date(item.current_period_end * 1000);
  return null;
}

// ── In-app subscription management (replaces the hosted Customer Portal) ──────

export type ManageDetails = {
  status: SubscriptionStatus;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
  card: { brand: string; last4: string } | null;
};

/** Load a subscription's display details for the manage page (status, period, card). */
export async function getSubscriptionForManage(subscriptionId: string): Promise<ManageDetails | null> {
  try {
    const sub = await stripe().subscriptions.retrieve(subscriptionId, { expand: ["default_payment_method"] });
    const pm = typeof sub.default_payment_method === "object" ? sub.default_payment_method : null;
    const card = pm?.card ? { brand: pm.card.brand, last4: pm.card.last4 } : null;
    return {
      status: mapStripeStatus(sub.status),
      currentPeriodEnd: periodEnd(sub),
      cancelAtPeriodEnd: Boolean(sub.cancel_at_period_end),
      card,
    };
  } catch {
    return null;
  }
}

/**
 * Swap a LIVE subscription onto a different plan's price, on Stripe, with
 * proration — so an upgrade/downgrade actually changes what the customer is
 * billed instead of only flipping our local plan field. Returns false if the
 * plan has no configured price or Stripe rejects the change.
 */
export async function changeSubscriptionPlan(subscriptionId: string, plan: Plan): Promise<boolean> {
  try {
    const priceId = stripePriceId(plan);
    if (!priceId) return false;
    const sub = await stripe().subscriptions.retrieve(subscriptionId);
    const itemId = sub.items.data[0]?.id;
    if (!itemId) return false;
    // Already on this price? Nothing to do — treat as success.
    if (sub.items.data[0]?.price?.id === priceId) return true;
    await stripe().subscriptions.update(subscriptionId, {
      items: [{ id: itemId, price: priceId }],
      proration_behavior: "create_prorations",
      payment_behavior: "allow_incomplete",
    });
    return true;
  } catch (err) {
    console.error("[stripe] changeSubscriptionPlan failed:", err);
    return false;
  }
}

/** Schedule (or undo) cancellation at the end of the current period. */
export async function setCancelAtPeriodEnd(subscriptionId: string, cancel: boolean): Promise<boolean> {
  try {
    await stripe().subscriptions.update(subscriptionId, { cancel_at_period_end: cancel });
    return true;
  } catch {
    return false;
  }
}

/** Create a SetupIntent so the owner can enter a new card with the Payment Element. */
export async function createSetupIntentForCustomer(customerId: string): Promise<string | null> {
  try {
    const si = await stripe().setupIntents.create({
      customer: customerId,
      usage: "off_session",
      payment_method_types: ["card"],
    });
    return si.client_secret;
  } catch {
    return null;
  }
}

/** After a SetupIntent succeeds, make its card the customer's + subscription's default. */
export async function applySetupIntentAsDefault(
  setupIntentId: string, customerId: string, subscriptionId: string | null,
): Promise<boolean> {
  try {
    const si = await stripe().setupIntents.retrieve(setupIntentId);
    const pm = typeof si.payment_method === "string" ? si.payment_method : si.payment_method?.id;
    if (!pm) return false;
    await stripe().customers.update(customerId, { invoice_settings: { default_payment_method: pm } });
    if (subscriptionId) await stripe().subscriptions.update(subscriptionId, { default_payment_method: pm });
    return true;
  } catch {
    return false;
  }
}

export type InvoiceRow = { id: string; date: Date; amountCents: number; currency: string; status: string; url: string | null };

/** Recent invoices for the customer (payment history). */
export async function listInvoices(customerId: string, limit = 6): Promise<InvoiceRow[]> {
  try {
    const res = await stripe().invoices.list({ customer: customerId, limit });
    return res.data.map((i) => ({
      id: i.id ?? "",
      date: new Date((i.created ?? 0) * 1000),
      amountCents: i.total ?? 0,
      currency: (i.currency ?? "usd").toUpperCase(),
      status: i.status ?? "",
      url: i.hosted_invoice_url ?? i.invoice_pdf ?? null,
    }));
  } catch {
    return [];
  }
}
