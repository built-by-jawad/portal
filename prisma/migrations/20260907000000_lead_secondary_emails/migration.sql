-- AlterTable
ALTER TABLE "Lead" ADD COLUMN     "secondaryEmails" TEXT[] DEFAULT ARRAY[]::TEXT[];

