/*
  Warnings:

  - You are about to drop the column `faviconUrl` on the `brand` table. All the data in the column will be lost.
  - You are about to drop the column `faviconUrl` on the `source` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "brand" DROP COLUMN "faviconUrl";

-- AlterTable
ALTER TABLE "source" DROP COLUMN "faviconUrl";
