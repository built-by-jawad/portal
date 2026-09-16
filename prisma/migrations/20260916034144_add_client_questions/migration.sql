-- CreateTable
CREATE TABLE "ClientQuestion" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClientQuestion_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ClientQuestion" ADD CONSTRAINT "ClientQuestion_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;
