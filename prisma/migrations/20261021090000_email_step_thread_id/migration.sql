-- Store Gmail's own thread id so follow-ups can be forced into the same thread server-side.
ALTER TABLE "EmailStepRecord" ADD COLUMN "threadId" TEXT;
