-- AlterTable
ALTER TABLE "invitation" ADD COLUMN     "promptId" TEXT;

-- AlterTable
ALTER TABLE "member" ADD COLUMN     "promptId" TEXT;

-- AddForeignKey
ALTER TABLE "member" ADD CONSTRAINT "member_promptId_fkey" FOREIGN KEY ("promptId") REFERENCES "prompt"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invitation" ADD CONSTRAINT "invitation_promptId_fkey" FOREIGN KEY ("promptId") REFERENCES "prompt"("id") ON DELETE SET NULL ON UPDATE CASCADE;
