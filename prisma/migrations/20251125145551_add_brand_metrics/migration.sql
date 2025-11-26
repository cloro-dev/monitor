-- CreateTable
CREATE TABLE "brand_metrics" (
    "id" TEXT NOT NULL,
    "brandId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "competitorId" TEXT,
    "date" DATE NOT NULL,
    "model" "ProviderModel" NOT NULL,
    "totalMentions" INTEGER NOT NULL DEFAULT 0,
    "averagePosition" DOUBLE PRECISION,
    "averageSentiment" DOUBLE PRECISION,
    "visibilityScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalResults" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "brand_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "brand_metrics_brandId_date_idx" ON "brand_metrics"("brandId", "date" DESC);

-- CreateIndex
CREATE INDEX "brand_metrics_organizationId_date_idx" ON "brand_metrics"("organizationId", "date" DESC);

-- CreateIndex
CREATE INDEX "brand_metrics_competitorId_date_idx" ON "brand_metrics"("competitorId", "date" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "brand_metrics_brandId_organizationId_competitorId_date_mode_key" ON "brand_metrics"("brandId", "organizationId", "competitorId", "date", "model");

-- AddForeignKey
ALTER TABLE "brand_metrics" ADD CONSTRAINT "brand_metrics_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "brand"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "brand_metrics" ADD CONSTRAINT "brand_metrics_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "brand_metrics" ADD CONSTRAINT "brand_metrics_competitorId_fkey" FOREIGN KEY ("competitorId") REFERENCES "brand"("id") ON DELETE CASCADE ON UPDATE CASCADE;
