-- Removes real Gmail sending/tracking entirely. The portal becomes pure drafting/reference: no
-- send, no open/click tracking, no reply detection. "EmailAccount" (OAuth-connected Gmail
-- accounts) is replaced by "SenderEmail" (a plain typed-in address, display only).

-- ClickEvent depended on EmailStepRecord; drop it first.
DROP TABLE "ClickEvent";

-- Drop the Gmail-send/tracking columns from EmailStepRecord.
ALTER TABLE "EmailStepRecord"
  DROP COLUMN "threadMode",
  DROP COLUMN "condition",
  DROP COLUMN "sentAt",
  DROP COLUMN "repliedAt",
  DROP COLUMN "gmailThreadId",
  DROP COLUMN "gmailMessageId",
  DROP COLUMN "openedAt",
  DROP COLUMN "openCount",
  DROP COLUMN "clickCount",
  DROP COLUMN "firstClickAt",
  DROP COLUMN "lastClickAt";

-- Lead.sendAccountId currently references EmailAccount; drop that FK before replacing the table.
ALTER TABLE "Lead" DROP CONSTRAINT IF EXISTS "Lead_sendAccountId_fkey";

-- Replace EmailAccount (OAuth fields) with SenderEmail (plain address, display only). Any
-- existing connected account's email is preserved as a plain SenderEmail row so leads keep
-- pointing at a valid row; its OAuth tokens are simply dropped.
CREATE TABLE "SenderEmail" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SenderEmail_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SenderEmail_email_key" ON "SenderEmail"("email");

INSERT INTO "SenderEmail" ("id", "email", "isDefault", "createdAt")
SELECT "id", "email", "isDefault", "createdAt" FROM "EmailAccount";

DROP TABLE "EmailAccount";

ALTER TABLE "Lead" ADD CONSTRAINT "Lead_sendAccountId_fkey"
  FOREIGN KEY ("sendAccountId") REFERENCES "SenderEmail"("id") ON DELETE SET NULL ON UPDATE CASCADE;
