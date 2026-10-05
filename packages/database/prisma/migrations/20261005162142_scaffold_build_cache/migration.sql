-- CreateEnum
CREATE TYPE "scaffold_schema"."SCAFFOLD_JOB_STATUS" AS ENUM ('building', 'ready', 'failed');

-- AlterTable
ALTER TABLE "scaffold_schema"."ScaffoldJob" ADD COLUMN     "buildKey" TEXT,
ADD COLUMN     "envVars" JSONB,
ADD COLUMN     "platforms" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "refundedAt" TIMESTAMP(3),
ADD COLUMN     "status" "scaffold_schema"."SCAFFOLD_JOB_STATUS" NOT NULL DEFAULT 'ready';

-- CreateIndex
CREATE INDEX "ScaffoldJob_userId_buildKey_idx" ON "scaffold_schema"."ScaffoldJob"("userId", "buildKey");
