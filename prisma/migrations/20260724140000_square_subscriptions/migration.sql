-- Self-serve subscriptions (Square).
-- New paid tiers on the Plan enum (PRO kept as a legacy alias), a
-- SubscriptionStatus enum, and Square billing columns on Tenant.

-- New paid plan tiers. (Existing PRO rows are unaffected.)
ALTER TYPE "Plan" ADD VALUE IF NOT EXISTS 'TEAM';
ALTER TYPE "Plan" ADD VALUE IF NOT EXISTS 'BARBERSHOP';

-- Billing state of a tenant's Square subscription.
CREATE TYPE "SubscriptionStatus" AS ENUM ('NONE', 'PENDING', 'TRIALING', 'ACTIVE', 'PAST_DUE', 'CANCELED');

-- Square billing columns (all nullable / defaulted — no data backfill needed).
ALTER TABLE "Tenant"
  ADD COLUMN "subscriptionStatus" "SubscriptionStatus" NOT NULL DEFAULT 'NONE',
  ADD COLUMN "squareCustomerId" TEXT,
  ADD COLUMN "squareSubscriptionId" TEXT,
  ADD COLUMN "squarePlanVariationId" TEXT,
  ADD COLUMN "billingEmail" TEXT,
  ADD COLUMN "trialEndsAt" TIMESTAMP(3),
  ADD COLUMN "currentPeriodEnd" TIMESTAMP(3);
