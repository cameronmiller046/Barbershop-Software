-- Sales attribution + store visit log (SWSales-Page app, shared DB).

-- New sales roles (used by the separate SWSales-Page service).
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'SALES_REP';
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'SALES_MANAGER';

-- Visit outcome enum.
CREATE TYPE "VisitStatus" AS ENUM ('VISITED', 'INTERESTED', 'ENROLLED', 'DECLINED');

-- Attribute a shop to the rep who enrolled it.
ALTER TABLE "Tenant" ADD COLUMN "salesRepId" TEXT;
ALTER TABLE "Tenant"
  ADD CONSTRAINT "Tenant_salesRepId_fkey"
  FOREIGN KEY ("salesRepId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Store visit log.
CREATE TABLE "StoreVisit" (
  "id" TEXT NOT NULL,
  "storeName" TEXT NOT NULL,
  "address" TEXT,
  "contactName" TEXT,
  "contactPhone" TEXT,
  "contactEmail" TEXT,
  "notes" TEXT,
  "status" "VisitStatus" NOT NULL DEFAULT 'VISITED',
  "salesRepId" TEXT NOT NULL,
  "enrolledTenantId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "StoreVisit_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "StoreVisit_salesRepId_createdAt_idx" ON "StoreVisit"("salesRepId", "createdAt");
CREATE INDEX "StoreVisit_status_idx" ON "StoreVisit"("status");
ALTER TABLE "StoreVisit"
  ADD CONSTRAINT "StoreVisit_salesRepId_fkey"
  FOREIGN KEY ("salesRepId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
