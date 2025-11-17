/*
  Warnings:

  - You are about to drop the column `entities` on the `BrandMetrics` table. All the data in the column will be lost.
  - You are about to drop the column `visibilityScore` on the `BrandMetrics` table. All the data in the column will be lost.
  - Added the required column `competitors` to the `BrandMetrics` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `position` on the `BrandMetrics` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- AlterTable
ALTER TABLE "BrandMetrics" DROP COLUMN "entities",
DROP COLUMN "visibilityScore",
ADD COLUMN     "competitors" JSONB NOT NULL,
DROP COLUMN "position",
ADD COLUMN     "position" INTEGER NOT NULL;
