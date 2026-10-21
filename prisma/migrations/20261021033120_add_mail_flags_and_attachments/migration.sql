-- AlterTable
ALTER TABLE "MailMessage" ADD COLUMN     "flagged" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "MailAttachment" (
    "id" TEXT NOT NULL,
    "mailMessageId" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "url" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MailAttachment_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "MailAttachment" ADD CONSTRAINT "MailAttachment_mailMessageId_fkey" FOREIGN KEY ("mailMessageId") REFERENCES "MailMessage"("id") ON DELETE CASCADE ON UPDATE CASCADE;
