-- CreateTable
CREATE TABLE "precomputed_source_chart" (
    "id" TEXT NOT NULL,
    "brandId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "timeRange" TEXT NOT NULL,
    "tab" TEXT NOT NULL,
    "chartData" JSONB NOT NULL,
    "chartConfig" JSONB NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "precomputed_source_chart_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "precomputed_competitor_chart" (
    "id" TEXT NOT NULL,
    "brandId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "lookbackDays" INTEGER NOT NULL,
    "chartData" JSONB NOT NULL,
    "chartConfig" JSONB NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "precomputed_competitor_chart_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "precomputed_source_chart_brandId_idx" ON "precomputed_source_chart"("brandId");

-- CreateIndex
CREATE INDEX "precomputed_source_chart_organizationId_idx" ON "precomputed_source_chart"("organizationId");

-- CreateIndex
CREATE INDEX "precomputed_source_chart_date_idx" ON "precomputed_source_chart"("date" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "precomputed_source_chart_brandId_organizationId_timeRange_t_key" ON "precomputed_source_chart"("brandId", "organizationId", "timeRange", "tab");

-- CreateIndex
CREATE INDEX "precomputed_competitor_chart_brandId_idx" ON "precomputed_competitor_chart"("brandId");

-- CreateIndex
CREATE INDEX "precomputed_competitor_chart_organizationId_idx" ON "precomputed_competitor_chart"("organizationId");

-- CreateIndex
CREATE INDEX "precomputed_competitor_chart_date_idx" ON "precomputed_competitor_chart"("date" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "precomputed_competitor_chart_brandId_organizationId_key" ON "precomputed_competitor_chart"("brandId", "organizationId");

-- CreateIndex
CREATE INDEX "brand_metrics_date_idx" ON "brand_metrics"("date");

-- CreateIndex
CREATE INDEX "result_createdAt_idx" ON "result"("createdAt");

-- CreateIndex
CREATE INDEX "source_metrics_date_idx" ON "source_metrics"("date");
