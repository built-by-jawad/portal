-- Create Mailbox table
CREATE TABLE "Mailbox" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Mailbox_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Mailbox_email_key" ON "Mailbox"("email");

-- Backfill Mailbox rows from existing SenderEmail rows (label defaults to the email itself)
INSERT INTO "Mailbox" ("id", "label", "email", "isActive", "createdAt", "updatedAt")
SELECT "id", "email", "email", true, "createdAt", "createdAt" FROM "SenderEmail";

-- Lead: add timezone/mailboxId/sequenceStartedAt, migrate sendAccountId -> mailboxId, drop sendAccountId
ALTER TABLE "Lead" ADD COLUMN "timezone" TEXT;
ALTER TABLE "Lead" ADD COLUMN "mailboxId" TEXT;
ALTER TABLE "Lead" ADD COLUMN "sequenceStartedAt" TIMESTAMP(3);

UPDATE "Lead" SET "mailboxId" = "sendAccountId" WHERE "sendAccountId" IS NOT NULL;

ALTER TABLE "Lead" DROP COLUMN "sendAccountId";
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_mailboxId_fkey" FOREIGN KEY ("mailboxId") REFERENCES "Mailbox"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Drop old SenderEmail table now that its data has been migrated
DROP TABLE "SenderEmail";

-- EmailStepRecord: add send-tracking fields
ALTER TABLE "EmailStepRecord" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'PENDING';
ALTER TABLE "EmailStepRecord" ADD COLUMN "sentAt" TIMESTAMP(3);
ALTER TABLE "EmailStepRecord" ADD COLUMN "sentFromMailboxId" TEXT;
ALTER TABLE "EmailStepRecord" ADD COLUMN "claimedAt" TIMESTAMP(3);
ALTER TABLE "EmailStepRecord" ADD COLUMN "messageId" TEXT;
ALTER TABLE "EmailStepRecord" ADD CONSTRAINT "EmailStepRecord_sentFromMailboxId_fkey" FOREIGN KEY ("sentFromMailboxId") REFERENCES "Mailbox"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- outreachStatus rename: IN_SEQUENCE -> SEQUENCE_STARTED, TEARDOWN_SENT removed (no leads currently use it)
UPDATE "Lead" SET "outreachStatus" = 'SEQUENCE_STARTED' WHERE "outreachStatus" = 'IN_SEQUENCE';
