-- AlterTable
ALTER TABLE "Tenant" ADD COLUMN "isDemo" BOOLEAN NOT NULL DEFAULT false;

-- Backfill: the sample stores loaded by "Try the demo" are demo data and must
-- stay out of live/public surfaces. (The flagship showcase stays a real store.)
UPDATE "Tenant" SET "isDemo" = true WHERE "slug" IN (
  'fade-factory', 'the-gentlemans-cut', 'sharp-edges', 'classic-clippers',
  'urban-mane', 'king-cuts', 'the-barber-lounge', 'first-chair-grooming'
);
