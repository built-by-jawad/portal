CREATE TABLE "ClientQuestionMedia" (
    "id" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "contentType" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ClientQuestionMedia_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ClientQuestionMedia_questionId_idx" ON "ClientQuestionMedia"("questionId");
ALTER TABLE "ClientQuestionMedia" ADD CONSTRAINT "ClientQuestionMedia_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "ClientQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
