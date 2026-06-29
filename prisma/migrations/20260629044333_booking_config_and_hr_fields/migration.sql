-- AlterTable
ALTER TABLE "Tenant" ADD COLUMN     "googleRating" DOUBLE PRECISION,
ADD COLUMN     "slotIntervalMin" INTEGER NOT NULL DEFAULT 15;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "dateOfBirth" TIMESTAMP(3),
ADD COLUMN     "hireDate" TIMESTAMP(3);
