-- CreateIndex
CREATE INDEX "prompt_status_createdAt_idx" ON "prompt"("status", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "result_status_createdAt_idx" ON "result"("status", "createdAt" DESC);
