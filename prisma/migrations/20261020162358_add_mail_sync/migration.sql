-- CreateTable
CREATE TABLE "MailMessage" (
    "id" TEXT NOT NULL,
    "mailboxId" TEXT NOT NULL,
    "folder" TEXT NOT NULL,
    "uid" INTEGER NOT NULL,
    "messageId" TEXT,
    "inReplyTo" TEXT,
    "threadKey" TEXT NOT NULL,
    "fromAddress" TEXT NOT NULL,
    "fromName" TEXT,
    "toAddress" TEXT,
    "subject" TEXT NOT NULL,
    "textPlain" TEXT,
    "textHtml" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "seen" BOOLEAN NOT NULL DEFAULT false,
    "sentByPortal" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MailMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MailSyncState" (
    "id" TEXT NOT NULL,
    "mailboxId" TEXT NOT NULL,
    "folder" TEXT NOT NULL,
    "lastUid" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MailSyncState_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MailMessage_mailboxId_threadKey_idx" ON "MailMessage"("mailboxId", "threadKey");

-- CreateIndex
CREATE UNIQUE INDEX "MailMessage_mailboxId_folder_uid_key" ON "MailMessage"("mailboxId", "folder", "uid");

-- CreateIndex
CREATE UNIQUE INDEX "MailSyncState_mailboxId_folder_key" ON "MailSyncState"("mailboxId", "folder");

-- AddForeignKey
ALTER TABLE "MailMessage" ADD CONSTRAINT "MailMessage_mailboxId_fkey" FOREIGN KEY ("mailboxId") REFERENCES "Mailbox"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MailSyncState" ADD CONSTRAINT "MailSyncState_mailboxId_fkey" FOREIGN KEY ("mailboxId") REFERENCES "Mailbox"("id") ON DELETE CASCADE ON UPDATE CASCADE;
