/*
  Warnings:

  - You are about to drop the `Competitor` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ProviderResult` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Competitor" DROP CONSTRAINT "Competitor_brandId_fkey";

-- DropForeignKey
ALTER TABLE "Competitor" DROP CONSTRAINT "Competitor_competitorId_fkey";

-- DropForeignKey
ALTER TABLE "ProviderResult" DROP CONSTRAINT "ProviderResult_promptId_fkey";

-- DropTable
DROP TABLE "Competitor";

-- DropTable
DROP TABLE "ProviderResult";

-- CreateTable
CREATE TABLE "result" (
    "id" TEXT NOT NULL,
    "promptId" TEXT NOT NULL,
    "model" "ProviderModel" NOT NULL,
    "status" "TrackingStatus" NOT NULL DEFAULT 'PENDING',
    "response" JSONB,
    "sentiment" DOUBLE PRECISION,
    "position" INTEGER,
    "competitors" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "result_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "competitor" (
    "id" TEXT NOT NULL,
    "brandId" TEXT NOT NULL,
    "competitorId" TEXT NOT NULL,
    "status" "CompetitorStatus",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "competitor_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "result_promptId_idx" ON "result"("promptId");

-- CreateIndex
CREATE INDEX "result_model_idx" ON "result"("model");

-- CreateIndex
CREATE INDEX "competitor_brandId_idx" ON "competitor"("brandId");

-- CreateIndex
CREATE INDEX "competitor_competitorId_idx" ON "competitor"("competitorId");

-- CreateIndex
CREATE UNIQUE INDEX "competitor_brandId_competitorId_key" ON "competitor"("brandId", "competitorId");

-- AddForeignKey
ALTER TABLE "result" ADD CONSTRAINT "result_promptId_fkey" FOREIGN KEY ("promptId") REFERENCES "prompt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "competitor" ADD CONSTRAINT "competitor_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "brand"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "competitor" ADD CONSTRAINT "competitor_competitorId_fkey" FOREIGN KEY ("competitorId") REFERENCES "brand"("id") ON DELETE CASCADE ON UPDATE CASCADE;
