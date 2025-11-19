/*
  Warnings:

  - You are about to drop the `BrandCompetitors` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Country` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "BrandCompetitors" DROP CONSTRAINT "BrandCompetitors_brandId_fkey";

-- AlterTable
ALTER TABLE "brand" ALTER COLUMN "organizationId" DROP NOT NULL;

-- DropTable
DROP TABLE "BrandCompetitors";

-- DropTable
DROP TABLE "Country";

-- CreateTable
CREATE TABLE "Competitor" (
    "id" TEXT NOT NULL,
    "brandId" TEXT NOT NULL,
    "competitorId" TEXT NOT NULL,
    "status" "CompetitorStatus",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Competitor_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Competitor_brandId_idx" ON "Competitor"("brandId");

-- CreateIndex
CREATE INDEX "Competitor_competitorId_idx" ON "Competitor"("competitorId");

-- CreateIndex
CREATE UNIQUE INDEX "Competitor_brandId_competitorId_key" ON "Competitor"("brandId", "competitorId");

-- AddForeignKey
ALTER TABLE "Competitor" ADD CONSTRAINT "Competitor_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "brand"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Competitor" ADD CONSTRAINT "Competitor_competitorId_fkey" FOREIGN KEY ("competitorId") REFERENCES "brand"("id") ON DELETE CASCADE ON UPDATE CASCADE;
