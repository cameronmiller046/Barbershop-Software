-- AlterTable (Tenant): Stripe Connect + deposit settings
ALTER TABLE "Tenant"
  ADD COLUMN "stripeConnectAccountId" TEXT,
  ADD COLUMN "connectChargesEnabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "connectDetailsSubmitted" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "depositEnabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "depositType" TEXT NOT NULL DEFAULT 'PERCENT',
  ADD COLUMN "depositValue" INTEGER NOT NULL DEFAULT 0;

-- AlterTable (Appointment): deposit payment fields
ALTER TABLE "Appointment"
  ADD COLUMN "depositCents" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "paymentIntentId" TEXT,
  ADD COLUMN "paymentStatus" TEXT NOT NULL DEFAULT 'none';
