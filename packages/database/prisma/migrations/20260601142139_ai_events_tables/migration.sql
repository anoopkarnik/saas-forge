-- CreateEnum
CREATE TYPE "ai_schema"."AiJobStatus" AS ENUM ('PENDING', 'RUNNING', 'SUCCEEDED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ai_schema"."AiDocumentStatus" AS ENUM ('INGESTING', 'READY', 'FAILED');

-- CreateTable
CREATE TABLE "ai_schema"."AiJobRun" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "orgId" TEXT,
    "agentId" TEXT NOT NULL,
    "status" "ai_schema"."AiJobStatus" NOT NULL DEFAULT 'PENDING',
    "input" JSONB NOT NULL,
    "result" JSONB,
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "lastHeartbeatAt" TIMESTAMP(3),

    CONSTRAINT "AiJobRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_schema"."AiJobEvent" (
    "id" BIGSERIAL NOT NULL,
    "jobId" TEXT NOT NULL,
    "seq" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiJobEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_schema"."AiCollection" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "orgId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "embedder" TEXT NOT NULL,
    "embeddingDims" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiCollection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_schema"."AiDocument" (
    "id" TEXT NOT NULL,
    "collectionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "orgId" TEXT,
    "sourceType" TEXT NOT NULL,
    "sourceUri" TEXT,
    "title" TEXT NOT NULL,
    "status" "ai_schema"."AiDocumentStatus" NOT NULL DEFAULT 'INGESTING',
    "chunkCount" INTEGER NOT NULL DEFAULT 0,
    "byteSize" INTEGER,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "indexedAt" TIMESTAMP(3),

    CONSTRAINT "AiDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_schema"."AiDocumentChunk" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "collectionId" TEXT NOT NULL,
    "seq" INTEGER NOT NULL,
    "text" TEXT NOT NULL,
    "metadata" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiDocumentChunk_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AiJobRun_userId_createdAt_idx" ON "ai_schema"."AiJobRun"("userId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "AiJobRun_status_createdAt_idx" ON "ai_schema"."AiJobRun"("status", "createdAt");

-- CreateIndex
CREATE INDEX "AiJobRun_orgId_createdAt_idx" ON "ai_schema"."AiJobRun"("orgId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "AiJobEvent_jobId_seq_idx" ON "ai_schema"."AiJobEvent"("jobId", "seq");

-- CreateIndex
CREATE UNIQUE INDEX "AiJobEvent_jobId_seq_key" ON "ai_schema"."AiJobEvent"("jobId", "seq");

-- CreateIndex
CREATE INDEX "AiCollection_orgId_idx" ON "ai_schema"."AiCollection"("orgId");

-- CreateIndex
CREATE UNIQUE INDEX "AiCollection_userId_orgId_name_key" ON "ai_schema"."AiCollection"("userId", "orgId", "name");

-- CreateIndex
CREATE INDEX "AiDocument_collectionId_createdAt_idx" ON "ai_schema"."AiDocument"("collectionId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "AiDocument_userId_idx" ON "ai_schema"."AiDocument"("userId");

-- CreateIndex
CREATE INDEX "AiDocumentChunk_collectionId_idx" ON "ai_schema"."AiDocumentChunk"("collectionId");

-- CreateIndex
CREATE UNIQUE INDEX "AiDocumentChunk_documentId_seq_key" ON "ai_schema"."AiDocumentChunk"("documentId", "seq");

-- AddForeignKey
ALTER TABLE "ai_schema"."AiJobRun" ADD CONSTRAINT "AiJobRun_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user_schema"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_schema"."AiJobEvent" ADD CONSTRAINT "AiJobEvent_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "ai_schema"."AiJobRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_schema"."AiCollection" ADD CONSTRAINT "AiCollection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user_schema"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_schema"."AiDocument" ADD CONSTRAINT "AiDocument_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "ai_schema"."AiCollection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_schema"."AiDocumentChunk" ADD CONSTRAINT "AiDocumentChunk_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "ai_schema"."AiDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;
