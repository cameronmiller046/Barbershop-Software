-- Appointment reminders: per-shop settings + a sent marker on each appointment.
ALTER TABLE "Tenant"
  ADD COLUMN "remindersEnabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "reminderEmail" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "reminderSms" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "reminderHoursBefore" INTEGER NOT NULL DEFAULT 24;

ALTER TABLE "Appointment"
  ADD COLUMN "reminderSentAt" TIMESTAMP(3);

-- Only remind for appointments that are still upcoming; backfill nothing.
CREATE INDEX "Appointment_status_reminderSentAt_startTime_idx"
  ON "Appointment"("status", "reminderSentAt", "startTime");
