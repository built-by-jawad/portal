-- Additive only: the live site keeps working against these columns/tables being present.
ALTER TABLE "Lead" ADD COLUMN "city" TEXT,
ADD COLUMN "state" TEXT,
ADD COLUMN "instagram" TEXT,
ADD COLUMN "facebook" TEXT,
ADD COLUMN "linkedin" TEXT,
ADD COLUMN "channels" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "outreachStatus" TEXT NOT NULL DEFAULT 'NEW',
ADD COLUMN "stopReason" TEXT,
ADD COLUMN "sequenceDone" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "contactedAt" TIMESTAMP(3),
ADD COLUMN "repliedAt" TIMESTAMP(3),
ADD COLUMN "callBookedAt" TIMESTAMP(3),
ADD COLUMN "teardownSentAt" TIMESTAMP(3),
ADD COLUMN "wonAt" TIMESTAMP(3);

UPDATE "Lead" SET "outreachStatus" = CASE "status"
  WHEN 'CONTACTED' THEN 'IN_SEQUENCE'
  WHEN 'REPLIED' THEN 'REPLIED'
  WHEN 'BOOKED' THEN 'WON'
  WHEN 'DEAD' THEN 'BAD_FIT'
  ELSE 'NEW' END;

CREATE TABLE "OutreachSequence" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "startDate" TEXT NOT NULL,
    "stepIndex" INTEGER NOT NULL DEFAULT 0,
    "lastTouchDate" TEXT,
    "notes" TEXT,
    "nextActionDate" TEXT,
    "decision" TEXT,
    "repliedAt" TIMESTAMP(3),
    "done" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "OutreachSequence_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CadenceStep" (
    "id" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "day" INTEGER NOT NULL,
    "label" TEXT NOT NULL DEFAULT '',
    "isDecision" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "CadenceStep_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CadenceSetting" (
    "channel" TEXT NOT NULL,
    "repeatEvery" INTEGER NOT NULL DEFAULT 30,
    CONSTRAINT "CadenceSetting_pkey" PRIMARY KEY ("channel")
);

CREATE UNIQUE INDEX "OutreachSequence_leadId_channel_key" ON "OutreachSequence"("leadId", "channel");
CREATE UNIQUE INDEX "CadenceStep_channel_position_key" ON "CadenceStep"("channel", "position");

ALTER TABLE "OutreachSequence" ADD CONSTRAINT "OutreachSequence_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;
