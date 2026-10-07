-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "jobs_schema";

-- CreateEnum
CREATE TYPE "jobs_schema"."JOB_RUN_STATUS" AS ENUM ('dead', 'replayed', 'discarded');

-- CreateTable
CREATE TABLE "jobs_schema"."JobRun" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "payload" JSONB NOT NULL,
    "payloadHash" TEXT NOT NULL,
    "status" "jobs_schema"."JOB_RUN_STATUS" NOT NULL DEFAULT 'dead',
    "attempts" INTEGER NOT NULL,
    "lastError" TEXT NOT NULL,
    "eventId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JobRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "jobs_schema"."ScheduleRun" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "window" TIMESTAMP(3) NOT NULL,
    "firedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScheduleRun_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "JobRun_status_createdAt_idx" ON "jobs_schema"."JobRun"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ScheduleRun_name_window_key" ON "jobs_schema"."ScheduleRun"("name", "window");
