-- Barber social links shown on their public storefront profile.
ALTER TABLE "User" ADD COLUMN "facebookUrl" TEXT;
ALTER TABLE "User" ADD COLUMN "tiktokUrl" TEXT;
ALTER TABLE "User" ADD COLUMN "xUrl" TEXT;
ALTER TABLE "User" ADD COLUMN "youtubeUrl" TEXT;
