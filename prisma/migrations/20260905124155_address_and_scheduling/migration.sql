/*
  Warnings:

  - You are about to drop the column `city` on the `Lead` table. All the data in the column will be lost.
  - You are about to drop the column `source` on the `Lead` table. All the data in the column will be lost.
  - You are about to drop the column `state` on the `Lead` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "EmailStepRecord" ADD COLUMN     "scheduledDate" TEXT,
ADD COLUMN     "scheduledTime" TEXT,
ADD COLUMN     "scheduledTimezone" TEXT;

-- AlterTable
ALTER TABLE "Lead" DROP COLUMN "city",
DROP COLUMN "source",
DROP COLUMN "state",
ADD COLUMN     "address" TEXT;
