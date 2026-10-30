-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "assignedToIds" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "Task" DROP COLUMN "reminderSentAt";
