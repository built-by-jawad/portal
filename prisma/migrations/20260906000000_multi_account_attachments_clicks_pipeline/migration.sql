-- AlterTable
ALTER TABLE "EmailStepRecord" ADD COLUMN     "clickCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "condition" TEXT NOT NULL DEFAULT 'ALWAYS',
ADD COLUMN     "firstClickAt" TIMESTAMP(3),
ADD COLUMN     "lastClickAt" TIMESTAMP(3),
ADD COLUMN     "repliedAt" TIMESTAMP(3),
ADD COLUMN     "threadMode" TEXT NOT NULL DEFAULT 'THREAD';

-- AlterTable
ALTER TABLE "Lead" ADD COLUMN     "sendAccountId" TEXT;

-- DropTable
DROP TABLE "GoogleAuth";

-- CreateTable
CREATE TABLE "Attachment" (
    "id" TEXT NOT NULL,
    "emailStepRecordId" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "contentType" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Attachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClickEvent" (
    "id" TEXT NOT NULL,
    "emailStepRecordId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "clickedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClickEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailAccount" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT NOT NULL,
    "expiryDate" TIMESTAMP(3),
    "scope" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailAccount_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EmailAccount_email_key" ON "EmailAccount"("email");

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_sendAccountId_fkey" FOREIGN KEY ("sendAccountId") REFERENCES "EmailAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_emailStepRecordId_fkey" FOREIGN KEY ("emailStepRecordId") REFERENCES "EmailStepRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClickEvent" ADD CONSTRAINT "ClickEvent_emailStepRecordId_fkey" FOREIGN KEY ("emailStepRecordId") REFERENCES "EmailStepRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

