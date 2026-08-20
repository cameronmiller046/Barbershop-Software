-- Client messaging: reusable shop SMS/email templates + a send audit trail.

-- CreateEnum
CREATE TYPE "MessageChannel" AS ENUM ('SMS', 'EMAIL');

-- CreateEnum
CREATE TYPE "MessageStatus" AS ENUM ('SENT', 'LOGGED', 'FAILED');

-- CreateTable
CREATE TABLE "MessageTemplate" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "channel" "MessageChannel" NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'General',
    "subject" TEXT,
    "body" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "seedKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MessageTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientMessage" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "channel" "MessageChannel" NOT NULL,
    "toAddress" TEXT NOT NULL,
    "subject" TEXT,
    "body" TEXT NOT NULL,
    "status" "MessageStatus" NOT NULL,
    "error" TEXT,
    "sentById" TEXT,
    "sentByName" TEXT NOT NULL,
    "templateId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClientMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MessageTemplate_tenantId_seedKey_key" ON "MessageTemplate"("tenantId", "seedKey");

-- CreateIndex
CREATE INDEX "MessageTemplate_tenantId_channel_idx" ON "MessageTemplate"("tenantId", "channel");

-- CreateIndex
CREATE INDEX "ClientMessage_tenantId_clientId_createdAt_idx" ON "ClientMessage"("tenantId", "clientId", "createdAt");

-- AddForeignKey
ALTER TABLE "MessageTemplate" ADD CONSTRAINT "MessageTemplate_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientMessage" ADD CONSTRAINT "ClientMessage_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientMessage" ADD CONSTRAINT "ClientMessage_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
