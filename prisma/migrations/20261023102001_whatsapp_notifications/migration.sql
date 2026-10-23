-- AlterTable
ALTER TABLE "Profile" ADD COLUMN     "phone" TEXT,
ADD COLUMN     "whatsappEnabled" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "dueTime" TEXT,
ADD COLUMN     "reminderSentAt" TIMESTAMP(3);
