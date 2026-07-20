-- Focal point (CSS object-position) for each service photo.
ALTER TABLE "Service" ADD COLUMN "imagePosition" TEXT NOT NULL DEFAULT '50% 50%';
