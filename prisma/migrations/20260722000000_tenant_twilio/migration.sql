-- Per-shop Twilio credentials so managers can connect their own SMS account.
ALTER TABLE "Tenant"
  ADD COLUMN "twilioAccountSid" TEXT,
  ADD COLUMN "twilioAuthToken" TEXT,
  ADD COLUMN "twilioFromNumber" TEXT;
