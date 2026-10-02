-- Old lead-scoped engagement checklist had zero rows in production (the UI that fed it was removed
-- earlier), so this is a clean cut-over rather than a data migration.
DROP TABLE "EngagementDay";

ALTER TABLE "Lead" DROP COLUMN "socialPlatforms";

-- A business's social profile (manual add, or imported from an outreach Lead's active channel).
CREATE TABLE "EngagementProfile" (
    "id" TEXT NOT NULL,
    "businessName" TEXT NOT NULL,
    "leadId" TEXT,
    "platform" TEXT NOT NULL,
    "profileUrl" TEXT NOT NULL,
    "time" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EngagementProfile_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "EngagementProfile_leadId_idx" ON "EngagementProfile"("leadId");

ALTER TABLE "EngagementProfile" ADD CONSTRAINT "EngagementProfile_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Recreated, now scoped to a profile (one platform's checklist) instead of directly to a lead+platform.
CREATE TABLE "EngagementDay" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "dayNumber" INTEGER NOT NULL,
    "date" TEXT NOT NULL,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EngagementDay_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "EngagementDay_profileId_dayNumber_key" ON "EngagementDay"("profileId", "dayNumber");

ALTER TABLE "EngagementDay" ADD CONSTRAINT "EngagementDay_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "EngagementProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
