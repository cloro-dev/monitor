-- CreateTable
CREATE TABLE "source_metrics" (
    "id" TEXT NOT NULL,
    "brandId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "model" "ProviderModel" NOT NULL,
    "totalMentions" INTEGER NOT NULL DEFAULT 0,
    "uniquePrompts" INTEGER NOT NULL DEFAULT 0,
    "utilization" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "source_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "source_metrics_brandId_date_idx" ON "source_metrics"("brandId", "date" DESC);

-- CreateIndex
CREATE INDEX "source_metrics_organizationId_date_idx" ON "source_metrics"("organizationId", "date" DESC);

-- CreateIndex
CREATE INDEX "source_metrics_sourceId_date_idx" ON "source_metrics"("sourceId", "date" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "source_metrics_brandId_organizationId_sourceId_date_model_key" ON "source_metrics"("brandId", "organizationId", "sourceId", "date", "model");

-- AddForeignKey
ALTER TABLE "source_metrics" ADD CONSTRAINT "source_metrics_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "source"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "source_metrics" ADD CONSTRAINT "source_metrics_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "brand"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "source_metrics" ADD CONSTRAINT "source_metrics_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
