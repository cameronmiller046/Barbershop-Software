-- AlterTable
ALTER TABLE "Tenant" ADD COLUMN     "pastDueSince" TIMESTAMP(3),
ADD COLUMN     "dunningGraceDays" INTEGER NOT NULL DEFAULT 7;
