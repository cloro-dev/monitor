/*
  Warnings:

  - You are about to drop the column `promptId` on the `invitation` table. All the data in the column will be lost.
  - You are about to drop the column `promptId` on the `member` table. All the data in the column will be lost.
  - Added the required column `brandId` to the `prompt` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "invitation" DROP CONSTRAINT "invitation_promptId_fkey";

-- DropForeignKey
ALTER TABLE "member" DROP CONSTRAINT "member_promptId_fkey";

-- AlterTable
ALTER TABLE "invitation" DROP COLUMN "promptId";

-- AlterTable
ALTER TABLE "member" DROP COLUMN "promptId";

-- AlterTable
ALTER TABLE "prompt" ADD COLUMN     "brandId" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "prompt_brandId_idx" ON "prompt"("brandId");

-- AddForeignKey
ALTER TABLE "prompt" ADD CONSTRAINT "prompt_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "brand"("id") ON DELETE CASCADE ON UPDATE CASCADE;
