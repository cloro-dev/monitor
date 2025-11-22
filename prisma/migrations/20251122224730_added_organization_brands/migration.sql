/*
  Warnings:

  - You are about to drop the column `organizationId` on the `brand` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "brand" DROP CONSTRAINT "brand_organizationId_fkey";

-- DropIndex
DROP INDEX "brand_organizationId_idx";

-- AlterTable
ALTER TABLE "brand" DROP COLUMN "organizationId";

-- CreateTable
CREATE TABLE "organization_brand" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "brandId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'member',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "organization_brand_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "organization_brand_organizationId_idx" ON "organization_brand"("organizationId");

-- CreateIndex
CREATE INDEX "organization_brand_brandId_idx" ON "organization_brand"("brandId");

-- CreateIndex
CREATE UNIQUE INDEX "organization_brand_organizationId_brandId_key" ON "organization_brand"("organizationId", "brandId");

-- AddForeignKey
ALTER TABLE "organization_brand" ADD CONSTRAINT "organization_brand_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_brand" ADD CONSTRAINT "organization_brand_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "brand"("id") ON DELETE CASCADE ON UPDATE CASCADE;
