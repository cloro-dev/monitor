/*
  Warnings:

  - Changed the type of `sentiment` on the `BrandMetrics` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- AlterTable
ALTER TABLE "BrandMetrics" DROP COLUMN "sentiment",
ADD COLUMN     "sentiment" DOUBLE PRECISION NOT NULL;
