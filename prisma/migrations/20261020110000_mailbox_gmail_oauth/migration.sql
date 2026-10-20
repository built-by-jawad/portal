-- Add Gmail OAuth support to Mailbox alongside existing Titan SMTP mailboxes.
ALTER TABLE "Mailbox" ADD COLUMN "provider" TEXT NOT NULL DEFAULT 'TITAN';
ALTER TABLE "Mailbox" ADD COLUMN "refreshToken" TEXT;
ALTER TABLE "Mailbox" ADD COLUMN "accessToken" TEXT;
ALTER TABLE "Mailbox" ADD COLUMN "tokenExpiry" TIMESTAMP(3);
