-- Loyalty points ledger (enables 90-day expiry, the 200-point cap, and FIFO redemption).
CREATE TABLE "LoyaltyEntry" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "clientId" TEXT NOT NULL,
  "points" INTEGER NOT NULL,
  "redeemed" INTEGER NOT NULL DEFAULT 0,
  "earnedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "appointmentId" TEXT,
  CONSTRAINT "LoyaltyEntry_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "LoyaltyEntry_appointmentId_key" ON "LoyaltyEntry"("appointmentId");
CREATE INDEX "LoyaltyEntry_clientId_expiresAt_idx" ON "LoyaltyEntry"("clientId", "expiresAt");
CREATE INDEX "LoyaltyEntry_tenantId_expiresAt_idx" ON "LoyaltyEntry"("tenantId", "expiresAt");
ALTER TABLE "LoyaltyEntry" ADD CONSTRAINT "LoyaltyEntry_clientId_fkey"
  FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- New fair/capped defaults for the loyalty config.
ALTER TABLE "Tenant" ALTER COLUMN "loyaltyPointsPerVisit" SET DEFAULT 10;
ALTER TABLE "Tenant" ALTER COLUMN "loyaltyThreshold" SET DEFAULT 100;
ALTER TABLE "Tenant" ALTER COLUMN "loyaltyRewardLabel" SET DEFAULT '$10 off';
ALTER TABLE "Tenant" ALTER COLUMN "loyaltyRewardValueCents" SET DEFAULT 1000;

-- Bring already-created, still-unconfigured tenants onto the new defaults.
UPDATE "Tenant"
  SET "loyaltyPointsPerVisit" = 10, "loyaltyThreshold" = 100, "loyaltyRewardLabel" = '$10 off', "loyaltyRewardValueCents" = 1000
  WHERE "loyaltyEnabled" = false AND "loyaltyThreshold" = 10 AND "loyaltyPointsPerVisit" = 1 AND "loyaltyRewardValueCents" = 0;
