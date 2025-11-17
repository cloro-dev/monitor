/*
  Warnings:

  - You are about to drop the column `visibility` on the `BrandMetrics` table. All the data in the column will be lost.
  - Added the required column `position` to the `BrandMetrics` table without a default value. This is not possible if the table is not empty.
  - Added the required column `sentiment` to the `BrandMetrics` table without a default value. This is not possible if the table is not empty.
  - Added the required column `visibilityScore` to the `BrandMetrics` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "BrandMetrics" DROP COLUMN "visibility",
ADD COLUMN     "position" TEXT NOT NULL,
ADD COLUMN     "sentiment" TEXT NOT NULL,
ADD COLUMN     "visibilityScore" DOUBLE PRECISION NOT NULL;
