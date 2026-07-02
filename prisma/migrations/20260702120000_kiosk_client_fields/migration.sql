-- Self-check-in kiosk: lock an account to the kiosk surface only.
ALTER TABLE "User" ADD COLUMN "kioskOnly" BOOLEAN NOT NULL DEFAULT false;

-- Structured client identity captured at the kiosk (name kept as the display value).
ALTER TABLE "Client" ADD COLUMN "firstName" TEXT;
ALTER TABLE "Client" ADD COLUMN "lastName" TEXT;
ALTER TABLE "Client" ADD COLUMN "address" TEXT;
