-- SWSales-Page moved to its own database. Attribution is now a plain cross-service
-- ref instead of a foreign key to the (local) User table.

ALTER TABLE "Tenant" DROP CONSTRAINT IF EXISTS "Tenant_salesRepId_fkey";
ALTER TABLE "Tenant" ADD COLUMN "salesRepEmail" TEXT;
