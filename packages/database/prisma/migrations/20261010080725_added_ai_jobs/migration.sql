-- AlterTable
ALTER TABLE "ai_schema"."AiJobRun" ADD COLUMN     "inngestRunId" TEXT,
ADD COLUMN     "lastDispatchAt" TIMESTAMP(3);
