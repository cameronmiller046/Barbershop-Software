-- CreateTable
CREATE TABLE "TimeBreak" (
    "id" TEXT NOT NULL,
    "start" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "end" TIMESTAMP(3),
    "entryId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TimeBreak_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TimeBreak_entryId_idx" ON "TimeBreak"("entryId");

-- CreateIndex
CREATE INDEX "TimeBreak_userId_idx" ON "TimeBreak"("userId");

-- AddForeignKey
ALTER TABLE "TimeBreak" ADD CONSTRAINT "TimeBreak_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "TimeEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimeBreak" ADD CONSTRAINT "TimeBreak_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimeBreak" ADD CONSTRAINT "TimeBreak_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
