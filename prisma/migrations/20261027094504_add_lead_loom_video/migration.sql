-- AlterTable
ALTER TABLE "Lead" ADD COLUMN     "loomVideoScript" TEXT,
ADD COLUMN     "wantsLoomVideo" BOOLEAN NOT NULL DEFAULT false;
