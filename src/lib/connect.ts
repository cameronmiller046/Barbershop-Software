import { stripe, stripeConfigured } from "@/lib/stripe";
import { appUrl } from "@/lib/utils";

// Stripe Connect — each shop onboards its own Express connected account, so
// end-customer deposits are destination charges paid to that shop (the platform
// can take an application fee). Requires Connect to be enabled on the platform
// Stripe account.

export function connectEnabled(): boolean {
  return stripeConfigured();
}

/** Create an Express connected account for a shop; returns its account id. */
export async function createConnectAccount(input: { tenantId: string; email?: string | null; name: string }): Promise<string> {
  const account = await stripe().accounts.create({
    type: "express",
    email: input.email || undefined,
    business_profile: { name: input.name },
    capabilities: { card_payments: { requested: true }, transfers: { requested: true } },
    metadata: { tenantId: input.tenantId },
  });
  return account.id;
}

/** Stripe-hosted onboarding link for a connected account (refresh + return URLs). */
export async function createOnboardingLink(accountId: string): Promise<string> {
  const link = await stripe().accountLinks.create({
    account: accountId,
    refresh_url: appUrl("/portal/settings?connect=refresh"),
    return_url: appUrl("/portal/settings?connect=done"),
    type: "account_onboarding",
  });
  return link.url;
}

/** Optional Express dashboard login link (manage payouts). */
export async function createDashboardLink(accountId: string): Promise<string | null> {
  try {
    const link = await stripe().accounts.createLoginLink(accountId);
    return link.url;
  } catch {
    return null;
  }
}

/** Whether the connected account can accept charges + finished onboarding. */
export async function getConnectStatus(accountId: string): Promise<{ chargesEnabled: boolean; detailsSubmitted: boolean }> {
  try {
    const acct = await stripe().accounts.retrieve(accountId);
    return { chargesEnabled: Boolean(acct.charges_enabled), detailsSubmitted: Boolean(acct.details_submitted) };
  } catch {
    return { chargesEnabled: false, detailsSubmitted: false };
  }
}

/** Deposit amount (cents) for a service price, per the shop's settings. */
export function computeDepositCents(
  t: { depositEnabled: boolean; depositType: string; depositValue: number },
  servicePriceCents: number,
): number {
  if (!t.depositEnabled || t.depositValue <= 0 || servicePriceCents <= 0) return 0;
  const cents = t.depositType === "FIXED"
    ? t.depositValue
    : Math.round(servicePriceCents * (t.depositValue / 100));
  return Math.max(0, Math.min(cents, servicePriceCents));
}
