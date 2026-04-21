-- CreateEnum
CREATE TYPE "KYCChangeRequestStatus" AS ENUM ('NONE', 'REQUESTED', 'ACCEPTED');

-- AlterTable
ALTER TABLE "SellerProfile" ADD COLUMN     "kycChangeRequestStatus" "KYCChangeRequestStatus" NOT NULL DEFAULT 'NONE',
ADD COLUMN     "kycChangeRequestedAt" TIMESTAMP(3);
