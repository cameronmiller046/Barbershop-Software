import { SquareClient, SquareEnvironment, WebhooksHelper } from "square";
import type { Plan, SubscriptionStatus } from "@prisma/client";
import { planLimits, squareVariationId } from "@/lib/plans";
import { appUrl } from "@/lib/utils";

// ─────────────────────────────────────────────────────────────────────────────
// Square billing integration.
//
// Buyers pay on a Square-HOSTED checkout page, so no card data ever touches this
// app. We create a payment link tied to a subscription plan variation; Square
// creates the customer + subscription and notifies us via webhook. The tenant is
// correlated back to Square by the buyer's email (unique per owner account).
// ─────────────────────────────────────────────────────────────────────────────

const ACCESS_TOKEN = process.env.SQUARE_ACCESS_TOKEN?.trim() || "";
const LOCATION_ID = process.env.SQUARE_LOCATION_ID?.trim() || "";
const ENVIRONMENT =
  (process.env.SQUARE_ENVIRONMENT?.trim().toLowerCase() === "production")
    ? SquareEnvironment.Production
    : SquareEnvironment.Sandbox;

/** True when the server has enough Square config to talk to the API. */
export function squareConfigured(): boolean {
  return Boolean(ACCESS_TOKEN && LOCATION_ID);
}

let _client: SquareClient | null = null;
export function squareClient(): SquareClient {
  if (!ACCESS_TOKEN) throw new Error("SQUARE_ACCESS_TOKEN is not set.");
  if (!_client) {
    _client = new SquareClient({ token: ACCESS_TOKEN, environment: ENVIRONMENT });
  }
  return _client;
}

/**
 * Create a Square-hosted checkout link that subscribes the buyer to a paid plan.
 * Returns the URL to redirect the owner to. Throws if the plan isn't a paid tier,
 * Square isn't configured, or the plan's variation id env var is missing.
 */
export async function createSubscriptionCheckoutLink(input: {
  plan: Plan;
  tenantId: string;
  businessName: string;
  email: string;
}): Promise<string> {
  const limits = planLimits(input.plan);
  if (!limits.paid) throw new Error(`Plan ${input.plan} is not a paid subscription tier.`);
  if (!squareConfigured()) throw new Error("Square billing is not configured on the server.");

  const variationId = squareVariationId(input.plan);
  if (!variationId) {
    throw new Error(`No Square plan variation id configured for ${input.plan} (env ${limits.squareVariationEnv}).`);
  }

  const client = squareClient();
  const res = await client.checkout.paymentLinks.create({
    idempotencyKey: `sub-${input.tenantId}`,
    description: `${limits.label} subscription — ${input.businessName}`,
    quickPay: {
      name: `The Chair — ${limits.label} plan`,
      priceMoney: { amount: BigInt(limits.priceCents), currency: "USD" },
      locationId: LOCATION_ID,
    },
    checkoutOptions: {
      // NOTE: despite the field name, this must be the subscription plan
      // *variation* id (Square's Checkout API quirk).
      subscriptionPlanId: variationId,
      redirectUrl: appUrl(`/signup/success?tenant=${input.tenantId}`),
      askForShippingAddress: false,
    },
    prePopulatedData: { buyerEmail: input.email },
  });

  const url = res.paymentLink?.url ?? res.paymentLink?.longUrl;
  if (!url) throw new Error("Square did not return a checkout URL.");
  return url;
}

/** Map a Square subscription status string to our SubscriptionStatus enum. */
export function mapSquareStatus(status: string | undefined | null): SubscriptionStatus {
  switch ((status || "").toUpperCase()) {
    case "ACTIVE":
      return "ACTIVE";
    case "PENDING":
      return "PENDING";
    case "PAUSED":
      return "PAST_DUE";
    case "CANCELED":
    case "DEACTIVATED":
      return "CANCELED";
    default:
      return "PENDING";
  }
}

/** Look up a Square customer's email address (used to correlate webhooks → tenant). */
export async function getCustomerEmail(customerId: string): Promise<string | null> {
  try {
    const res = await squareClient().customers.get({ customerId });
    return res.customer?.emailAddress?.toLowerCase().trim() || null;
  } catch {
    return null;
  }
}

/**
 * Find the most relevant subscription for a buyer email, so we can reconcile a
 * tenant's status on demand (e.g. when the buyer returns from checkout before the
 * webhook has landed). Returns the raw Square subscription or null.
 */
export async function findSubscriptionForEmail(email: string): Promise<{
  id: string; customerId: string; status: SubscriptionStatus; planVariationId: string | null;
} | null> {
  const clean = email.toLowerCase().trim();
  const client = squareClient();

  // Find the customer by email.
  const custRes = await client.customers.search({
    query: { filter: { emailAddress: { exact: clean } } },
    limit: BigInt(1),
  });
  const customer = custRes.customers?.[0];
  if (!customer?.id) return null;

  const subRes = await client.subscriptions.search({
    query: { filter: { customerIds: [customer.id], locationIds: LOCATION_ID ? [LOCATION_ID] : undefined } },
  });
  const sub = subRes.subscriptions?.[0];
  if (!sub?.id) return null;

  return {
    id: sub.id,
    customerId: customer.id,
    status: mapSquareStatus(sub.status),
    planVariationId: sub.planVariationId ?? null,
  };
}

/**
 * Verify a Square webhook signature. `notificationUrl` MUST exactly match the
 * URL registered in the Square dashboard for this webhook subscription.
 */
export async function verifySquareWebhook(input: {
  rawBody: string;
  signatureHeader: string | null;
}): Promise<boolean> {
  const key = process.env.SQUARE_WEBHOOK_SIGNATURE_KEY?.trim();
  if (!key || !input.signatureHeader) return false;
  const notificationUrl = appUrl("/api/square/webhook");
  try {
    return await WebhooksHelper.verifySignature({
      requestBody: input.rawBody,
      signatureHeader: input.signatureHeader,
      signatureKey: key,
      notificationUrl,
    });
  } catch {
    return false;
  }
}
