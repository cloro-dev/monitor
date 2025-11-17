-- CreateEnum
CREATE TYPE "TrackingStatus" AS ENUM ('PENDING', 'PROCESSING', 'SUCCESS', 'FAILED');

-- CreateTable
CREATE TABLE "TrackingResult" (
    "id" TEXT NOT NULL,
    "promptId" TEXT NOT NULL,
    "status" "TrackingStatus" NOT NULL DEFAULT 'PENDING',
    "response" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrackingResult_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TrackingResult_promptId_idx" ON "TrackingResult"("promptId");

-- AddForeignKey
ALTER TABLE "TrackingResult" ADD CONSTRAINT "TrackingResult_promptId_fkey" FOREIGN KEY ("promptId") REFERENCES "prompt"("id") ON DELETE CASCADE ON UPDATE CASCADE;
