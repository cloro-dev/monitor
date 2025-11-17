-- CreateTable
CREATE TABLE "BrandMetrics" (
    "id" TEXT NOT NULL,
    "visibility" DOUBLE PRECISION NOT NULL,
    "entities" JSONB,
    "trackingResultId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BrandMetrics_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BrandMetrics_trackingResultId_key" ON "BrandMetrics"("trackingResultId");

-- AddForeignKey
ALTER TABLE "BrandMetrics" ADD CONSTRAINT "BrandMetrics_trackingResultId_fkey" FOREIGN KEY ("trackingResultId") REFERENCES "TrackingResult"("id") ON DELETE CASCADE ON UPDATE CASCADE;
