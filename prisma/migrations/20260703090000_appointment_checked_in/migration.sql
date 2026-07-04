-- Client arrival: "checked in / waiting" state before the cut starts.
ALTER TABLE "Appointment" ADD COLUMN "checkedInAt" TIMESTAMP(3);
