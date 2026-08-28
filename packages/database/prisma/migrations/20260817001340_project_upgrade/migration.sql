-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "scaffold_schema";

-- CreateEnum
CREATE TYPE "scaffold_schema"."SCAFFOLD_JOB_TYPE" AS ENUM ('download', 'upgrade');

-- CreateEnum
CREATE TYPE "scaffold_schema"."SCAFFOLD_JOB_SOURCE" AS ENUM ('web', 'api');

-- CreateTable
CREATE TABLE "scaffold_schema"."ProjectConfig" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "productTypeId" TEXT,
    "tierId" TEXT NOT NULL,
    "versionId" TEXT NOT NULL,
    "platforms" TEXT[],
    "modules" TEXT[],
    "config" JSONB NOT NULL,
    "templateVersion" TEXT NOT NULL,
    "lastBuiltHash" TEXT,
    "lastBuiltAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scaffold_schema"."ScaffoldJob" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "projectId" TEXT,
    "type" "scaffold_schema"."SCAFFOLD_JOB_TYPE" NOT NULL,
    "source" "scaffold_schema"."SCAFFOLD_JOB_SOURCE" NOT NULL,
    "fromModules" TEXT[],
    "toModules" TEXT[],
    "fromTierId" TEXT,
    "toTierId" TEXT NOT NULL,
    "creditsSpent" INTEGER NOT NULL,
    "templateVersion" TEXT NOT NULL,
    "idempotencyKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScaffoldJob_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProjectConfig_userId_idx" ON "scaffold_schema"."ProjectConfig"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectConfig_userId_slug_key" ON "scaffold_schema"."ProjectConfig"("userId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "ScaffoldJob_idempotencyKey_key" ON "scaffold_schema"."ScaffoldJob"("idempotencyKey");

-- CreateIndex
CREATE INDEX "ScaffoldJob_userId_idx" ON "scaffold_schema"."ScaffoldJob"("userId");

-- CreateIndex
CREATE INDEX "ScaffoldJob_projectId_idx" ON "scaffold_schema"."ScaffoldJob"("projectId");

-- AddForeignKey
ALTER TABLE "scaffold_schema"."ProjectConfig" ADD CONSTRAINT "ProjectConfig_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user_schema"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scaffold_schema"."ScaffoldJob" ADD CONSTRAINT "ScaffoldJob_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user_schema"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scaffold_schema"."ScaffoldJob" ADD CONSTRAINT "ScaffoldJob_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "scaffold_schema"."ProjectConfig"("id") ON DELETE SET NULL ON UPDATE CASCADE;
