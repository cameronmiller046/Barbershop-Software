-- More admin-settable social links for the storefront footer.
ALTER TABLE "Tenant" ADD COLUMN "xUrl" TEXT;
ALTER TABLE "Tenant" ADD COLUMN "youtubeUrl" TEXT;
