-- Loyalty program: owner config on Tenant, balances on Client, award flag on Appointment.
ALTER TABLE "Tenant"
  ADD COLUMN "loyaltyEnabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "loyaltyPointsPerVisit" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "loyaltyPointsPerDollar" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "loyaltyThreshold" INTEGER NOT NULL DEFAULT 10,
  ADD COLUMN "loyaltyRewardLabel" TEXT NOT NULL DEFAULT 'Free service',
  ADD COLUMN "loyaltyRewardValueCents" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "Client"
  ADD COLUMN "loyaltyPoints" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "loyaltyLifetimePoints" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "loyaltyRewardsRedeemed" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "Appointment"
  ADD COLUMN "loyaltyAwarded" BOOLEAN NOT NULL DEFAULT false;
