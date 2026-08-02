/*
  Warnings:

  - You are about to drop the column `embedding` on the `AiDocumentChunk` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "user_schema"."INVITATION_STATUS" AS ENUM ('PENDING', 'ACCEPTED', 'REVOKED');

-- AlterTable
ALTER TABLE "ai_schema"."AiDocumentChunk" DROP COLUMN "embedding";

-- CreateTable
CREATE TABLE "user_schema"."Invitation" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "status" "user_schema"."INVITATION_STATUS" NOT NULL DEFAULT 'PENDING',
    "invitedById" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Invitation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_schema"."AppSetting" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppSetting_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE UNIQUE INDEX "Invitation_token_key" ON "user_schema"."Invitation"("token");

-- CreateIndex
CREATE INDEX "Invitation_email_idx" ON "user_schema"."Invitation"("email");

-- CreateIndex
CREATE INDEX "Invitation_status_idx" ON "user_schema"."Invitation"("status");

-- AddForeignKey
ALTER TABLE "user_schema"."Invitation" ADD CONSTRAINT "Invitation_invitedById_fkey" FOREIGN KEY ("invitedById") REFERENCES "user_schema"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
