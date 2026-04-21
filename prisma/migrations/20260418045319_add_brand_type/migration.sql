-- CreateEnum
CREATE TYPE "BrandType" AS ENUM ('PREMIUM', 'ACTIVE', 'LEGACY');

-- AlterTable
ALTER TABLE "Brand" ADD COLUMN     "type" "BrandType" NOT NULL DEFAULT 'ACTIVE';
