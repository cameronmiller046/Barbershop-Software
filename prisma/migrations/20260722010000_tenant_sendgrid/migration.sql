-- Per-shop email sender (SendGrid) so managers can connect their own email.
ALTER TABLE "Tenant"
  ADD COLUMN "sendgridApiKey" TEXT,
  ADD COLUMN "emailFromAddress" TEXT;
