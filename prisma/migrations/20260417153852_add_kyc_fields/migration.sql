-- AlterTable
ALTER TABLE "SellerProfile" ADD COLUMN     "aadhaarImageUrl" TEXT,
ADD COLUMN     "aadhaarNumber" TEXT,
ADD COLUMN     "kycRejectionReason" TEXT,
ADD COLUMN     "kycSubmittedAt" TIMESTAMP(3),
ADD COLUMN     "panImageUrl" TEXT,
ADD COLUMN     "panNumber" TEXT;
