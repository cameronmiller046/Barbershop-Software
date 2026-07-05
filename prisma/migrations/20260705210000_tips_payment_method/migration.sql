-- Tips + payment method per appointment.
ALTER TABLE "Appointment" ADD COLUMN "tipCents" INTEGER;
ALTER TABLE "Appointment" ADD COLUMN "paymentMethod" TEXT;
