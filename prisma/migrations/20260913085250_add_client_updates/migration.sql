-- CreateTable
CREATE TABLE "ClientUpdate" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "taskName" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClientUpdate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientUpdateScreenshot" (
    "id" TEXT NOT NULL,
    "clientUpdateId" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "contentType" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClientUpdateScreenshot_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ClientUpdate" ADD CONSTRAINT "ClientUpdate_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientUpdateScreenshot" ADD CONSTRAINT "ClientUpdateScreenshot_clientUpdateId_fkey" FOREIGN KEY ("clientUpdateId") REFERENCES "ClientUpdate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
