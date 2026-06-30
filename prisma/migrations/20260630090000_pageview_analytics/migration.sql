-- CreateTable
CREATE TABLE "PageView" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT,
    "path" TEXT NOT NULL,
    "page" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "device" TEXT NOT NULL,
    "visitorHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PageView_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PageView_createdAt_idx" ON "PageView"("createdAt");

-- CreateIndex
CREATE INDEX "PageView_tenantId_createdAt_idx" ON "PageView"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "PageView_visitorHash_idx" ON "PageView"("visitorHash");
