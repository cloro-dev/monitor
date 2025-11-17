-- CreateTable
CREATE TABLE "brand" (
    "id" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "brandName" TEXT,
    "faviconUrl" TEXT,
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "brand_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "brand_domain_key" ON "brand"("domain");

-- CreateIndex
CREATE INDEX "brand_organizationId_idx" ON "brand"("organizationId");

-- CreateIndex
CREATE INDEX "brand_domain_idx" ON "brand"("domain");

-- AddForeignKey
ALTER TABLE "brand" ADD CONSTRAINT "brand_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
