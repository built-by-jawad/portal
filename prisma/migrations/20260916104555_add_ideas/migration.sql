-- CreateTable
CREATE TABLE "Idea" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "starred" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Idea_pkey" PRIMARY KEY ("id")
);
