-- CreateEnum
CREATE TYPE "PromptStatus" AS ENUM ('ACTIVE', 'SUGGESTED', 'ARCHIVED');

-- AlterTable
ALTER TABLE "prompt" ADD COLUMN     "status" "PromptStatus" NOT NULL DEFAULT 'ACTIVE';
