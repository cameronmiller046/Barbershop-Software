-- Rename Plan tiers: TRIAL→SOLO, STARTER→PRO, PRO→ENTERPRISE.
-- Order matters to avoid a name collision on PRO. Existing rows migrate in place.
ALTER TYPE "Plan" RENAME VALUE 'PRO' TO 'ENTERPRISE';
ALTER TYPE "Plan" RENAME VALUE 'STARTER' TO 'PRO';
ALTER TYPE "Plan" RENAME VALUE 'TRIAL' TO 'SOLO';

-- Update the column default to match the new SOLO value.
ALTER TABLE "Tenant" ALTER COLUMN "plan" SET DEFAULT 'SOLO';
