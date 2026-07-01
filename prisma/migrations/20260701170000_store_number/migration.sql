-- AlterTable: backfill existing rows with a random 1–999, then reset default to 0
-- (app assigns an explicit number on new stores).
ALTER TABLE "Tenant" ADD COLUMN "storeNumber" INTEGER NOT NULL DEFAULT floor(random() * 999 + 1)::int;
ALTER TABLE "Tenant" ALTER COLUMN "storeNumber" SET DEFAULT 0;
