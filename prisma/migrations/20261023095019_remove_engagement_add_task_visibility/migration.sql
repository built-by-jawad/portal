/*
  Warnings:

  - You are about to drop the `EngagementDay` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `EngagementProfile` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "EngagementDay" DROP CONSTRAINT "EngagementDay_profileId_fkey";

-- DropForeignKey
ALTER TABLE "EngagementProfile" DROP CONSTRAINT "EngagementProfile_leadId_fkey";

-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "createdById" TEXT,
ADD COLUMN     "visibleToAll" BOOLEAN NOT NULL DEFAULT true;

-- DropTable
DROP TABLE "EngagementDay";

-- DropTable
DROP TABLE "EngagementProfile";

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "Profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
