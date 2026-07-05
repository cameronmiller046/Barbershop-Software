-- Barber-suggested corrections to time entries (admins approve/reject).
CREATE TABLE "TimeEditRequest" (
    "id" TEXT NOT NULL,
    "proposedClockIn" TIMESTAMP(3),
    "proposedClockOut" TIMESTAMP(3),
    "reason" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "resolvedAt" TIMESTAMP(3),
    "resolvedById" TEXT,
    "tenantId" TEXT NOT NULL,
    "entryId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TimeEditRequest_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "TimeEditRequest_tenantId_status_idx" ON "TimeEditRequest"("tenantId", "status");
CREATE INDEX "TimeEditRequest_userId_idx" ON "TimeEditRequest"("userId");

ALTER TABLE "TimeEditRequest" ADD CONSTRAINT "TimeEditRequest_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TimeEditRequest" ADD CONSTRAINT "TimeEditRequest_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "TimeEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TimeEditRequest" ADD CONSTRAINT "TimeEditRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
