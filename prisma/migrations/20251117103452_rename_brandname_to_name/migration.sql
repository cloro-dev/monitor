/*
  Warnings:

  - You are about to drop the column `brandName` on the `brand` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "brand" DROP COLUMN "brandName",
ADD COLUMN     "name" TEXT;
