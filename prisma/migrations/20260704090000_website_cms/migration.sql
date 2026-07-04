-- Website Content CMS: owner-editable storefront fields.
ALTER TABLE "Tenant" ADD COLUMN "description" TEXT;
ALTER TABLE "Tenant" ADD COLUMN "website" TEXT;
ALTER TABLE "Tenant" ADD COLUMN "heroHeadline" TEXT;
ALTER TABLE "Tenant" ADD COLUMN "heroSubheading" TEXT;
ALTER TABLE "Tenant" ADD COLUMN "heroCtaText" TEXT;
ALTER TABLE "Tenant" ADD COLUMN "announcement" TEXT;
ALTER TABLE "Tenant" ADD COLUMN "instagramUrl" TEXT;
ALTER TABLE "Tenant" ADD COLUMN "facebookUrl" TEXT;
ALTER TABLE "Tenant" ADD COLUMN "tiktokUrl" TEXT;
ALTER TABLE "Tenant" ADD COLUMN "metaTitle" TEXT;
ALTER TABLE "Tenant" ADD COLUMN "metaDescription" TEXT;
ALTER TABLE "Tenant" ADD COLUMN "accentColor" TEXT;
ALTER TABLE "Tenant" ADD COLUMN "faviconUrl" TEXT;
ALTER TABLE "Tenant" ADD COLUMN "coverImageUrl" TEXT;
ALTER TABLE "Tenant" ADD COLUMN "showBarbers" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Tenant" ADD COLUMN "showGallery" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Tenant" ADD COLUMN "showReviews" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Tenant" ADD COLUMN "showFaq" BOOLEAN NOT NULL DEFAULT true;
