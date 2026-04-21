/*
  Warnings:

  - You are about to drop the column `brandId` on the `SparePart` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "SparePart" DROP CONSTRAINT "SparePart_brandId_fkey";

-- AlterTable
ALTER TABLE "SparePart" DROP COLUMN "brandId";
