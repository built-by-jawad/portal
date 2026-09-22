/*
  Warnings:

  - You are about to drop the column `convertedLeadId` on the `Prospect` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Prospect" DROP COLUMN "convertedLeadId",
ADD COLUMN     "customFields" JSONB NOT NULL DEFAULT '{}',
ADD COLUMN     "order" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "ProspectColumn" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'TEXT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProspectColumn_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProspectBoardSettings" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "columnOrder" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProspectBoardSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProspectChecklistItem" (
    "id" TEXT NOT NULL,
    "prospectId" TEXT NOT NULL,
    "section" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "checked" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProspectChecklistItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProspectColumn_key_key" ON "ProspectColumn"("key");

-- AddForeignKey
ALTER TABLE "ProspectChecklistItem" ADD CONSTRAINT "ProspectChecklistItem_prospectId_fkey" FOREIGN KEY ("prospectId") REFERENCES "Prospect"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- DataFix: seed "order" from createdAt so existing rows keep their relative position
-- (new rows get an explicit order in app code, added after whatever the current max is).
UPDATE "Prospect" SET "order" = sub.rn
FROM (SELECT "id", EXTRACT(EPOCH FROM "createdAt") AS rn FROM "Prospect") AS sub
WHERE "Prospect"."id" = sub."id";
