-- CreateTable
CREATE TABLE "source" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "hostname" TEXT NOT NULL,
    "title" TEXT,
    "faviconUrl" TEXT,
    "type" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "source_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_ResultSources" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_ResultSources_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "source_url_key" ON "source"("url");

-- CreateIndex
CREATE INDEX "source_hostname_idx" ON "source"("hostname");

-- CreateIndex
CREATE INDEX "_ResultSources_B_index" ON "_ResultSources"("B");

-- AddForeignKey
ALTER TABLE "_ResultSources" ADD CONSTRAINT "_ResultSources_A_fkey" FOREIGN KEY ("A") REFERENCES "result"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ResultSources" ADD CONSTRAINT "_ResultSources_B_fkey" FOREIGN KEY ("B") REFERENCES "source"("id") ON DELETE CASCADE ON UPDATE CASCADE;
