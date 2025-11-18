-- AlterTable
ALTER TABLE "BrandMetrics" ALTER COLUMN "competitors" DROP NOT NULL,
ALTER COLUMN "position" DROP NOT NULL,
ALTER COLUMN "sentiment" DROP NOT NULL;
