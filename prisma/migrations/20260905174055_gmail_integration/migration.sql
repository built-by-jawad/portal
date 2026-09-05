-- AlterTable
ALTER TABLE "EmailStepRecord" ADD COLUMN     "gmailMessageId" TEXT,
ADD COLUMN     "gmailThreadId" TEXT,
ADD COLUMN     "openCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "openedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "GoogleAuth" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "email" TEXT,
    "accessToken" TEXT,
    "refreshToken" TEXT NOT NULL,
    "expiryDate" TIMESTAMP(3),
    "scope" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GoogleAuth_pkey" PRIMARY KEY ("id")
);
