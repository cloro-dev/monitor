/*
  Warnings:

  - You are about to drop the `BrandMetrics` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `TrackingResult` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "ProviderModel" AS ENUM ('CHATGPT', 'PERPLEXITY', 'MICROSOFT_COPILOT', 'GOOGLE_AI_MODE', 'GOOGLE_AI_OVERVIEW');

-- DropForeignKey
ALTER TABLE "BrandMetrics" DROP CONSTRAINT "BrandMetrics_trackingResultId_fkey";

-- DropForeignKey
ALTER TABLE "TrackingResult" DROP CONSTRAINT "TrackingResult_promptId_fkey";

-- AlterTable
ALTER TABLE "organization" ADD COLUMN     "aiModels" JSONB;

-- DropTable
DROP TABLE "BrandMetrics";

-- DropTable
DROP TABLE "TrackingResult";

-- CreateTable
CREATE TABLE "ProviderResult" (
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

    CONSTRAINT "ProviderResult_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProviderResult_promptId_idx" ON "ProviderResult"("promptId");

-- CreateIndex
CREATE INDEX "ProviderResult_model_idx" ON "ProviderResult"("model");

-- AddForeignKey
ALTER TABLE "ProviderResult" ADD CONSTRAINT "ProviderResult_promptId_fkey" FOREIGN KEY ("promptId") REFERENCES "prompt"("id") ON DELETE CASCADE ON UPDATE CASCADE;
