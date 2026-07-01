-- AlterTable
ALTER TABLE "Appointment" ADD COLUMN "startedAt" TIMESTAMP(3);
ALTER TABLE "Appointment" ADD COLUMN "finishedAt" TIMESTAMP(3);
ALTER TABLE "Appointment" ADD COLUMN "collectedCents" INTEGER;
ALTER TABLE "Appointment" ADD COLUMN "kind" TEXT NOT NULL DEFAULT 'APPOINTMENT';
ALTER TABLE "Appointment" ADD COLUMN "referral" TEXT;
