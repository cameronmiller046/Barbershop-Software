-- Self-serve subscriptions (Stripe).
-- New paid tiers on the Plan enum (PRO kept as a legacy alias), a
-- SubscriptionStatus enum, and Stripe billing columns on Tenant.

-- New paid plan tiers. (Existing PRO rows are unaffected.)
ALTER TYPE "Plan" ADD VALUE IF NOT EXISTS 'TEAM';
ALTER TYPE "Plan" ADD VALUE IF NOT EXISTS 'BARBERSHOP';

-- Billing state of a tenant's Stripe subscription.
CREATE TYPE "SubscriptionStatus" AS ENUM ('NONE', 'PENDING', 'TRIALING', 'ACTIVE', 'PAST_DUE', 'CANCELED');

-- Stripe billing columns (all nullable / defaulted — no data backfill needed).
ALTER TABLE "Tenant"
  ADD COLUMN "subscriptionStatus" "SubscriptionStatus" NOT NULL DEFAULT 'NONE',
  ADD COLUMN "stripeCustomerId" TEXT,
  ADD COLUMN "stripeSubscriptionId" TEXT,
  ADD COLUMN "stripePriceId" TEXT,
  ADD COLUMN "billingEmail" TEXT,
  ADD COLUMN "trialEndsAt" TIMESTAMP(3),
  ADD COLUMN "currentPeriodEnd" TIMESTAMP(3);
