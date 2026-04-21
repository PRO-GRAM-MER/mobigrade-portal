/*
  Warnings:

  - Added the required column `category` to the `SparePart` table without a default value. This is not possible if the table is not empty.
  - Added the required column `qualityGrade` to the `SparePart` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "PartCategory" AS ENUM ('DISPLAY', 'BATTERY', 'CAMERA_REAR', 'CAMERA_FRONT', 'AUDIO', 'CHARGING', 'BODY', 'SENSOR', 'INTERNAL', 'THERMAL', 'OTHER');

-- CreateEnum
CREATE TYPE "QualityGrade" AS ENUM ('OEM', 'AFTERMARKET_HIGH', 'AFTERMARKET_LOW');

-- AlterTable
ALTER TABLE "SparePart" ADD COLUMN     "adminNotes" TEXT,
ADD COLUMN     "category" "PartCategory" NOT NULL,
ADD COLUMN     "qualityGrade" "QualityGrade" NOT NULL,
ADD COLUMN     "warrantyDays" INTEGER;
