-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "ai_schema";

-- CreateTable
CREATE TABLE "ai_schema"."AiPrompt" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "activeVersionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiPrompt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_schema"."AiPromptVersion" (
    "id" TEXT NOT NULL,
    "promptId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "model" TEXT,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiPromptVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_schema"."AiConversation" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "promptKey" TEXT NOT NULL,
    "promptVersionId" TEXT,
    "title" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiConversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_schema"."AiMessage" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "parts" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_schema"."AiUsageEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "conversationId" TEXT,
    "promptKey" TEXT NOT NULL,
    "promptVersionId" TEXT,
    "provider" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "requestTokens" INTEGER NOT NULL DEFAULT 0,
    "responseTokens" INTEGER NOT NULL DEFAULT 0,
    "totalTokens" INTEGER NOT NULL DEFAULT 0,
    "creditsCharged" INTEGER NOT NULL DEFAULT 0,
    "latencyMs" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL,
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiUsageEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AiPrompt_key_key" ON "ai_schema"."AiPrompt"("key");

-- CreateIndex
CREATE UNIQUE INDEX "AiPromptVersion_promptId_version_key" ON "ai_schema"."AiPromptVersion"("promptId", "version");
CREATE INDEX "AiPromptVersion_promptId_idx" ON "ai_schema"."AiPromptVersion"("promptId");
CREATE INDEX "AiPromptVersion_createdByUserId_idx" ON "ai_schema"."AiPromptVersion"("createdByUserId");

-- CreateIndex
CREATE INDEX "AiConversation_userId_idx" ON "ai_schema"."AiConversation"("userId");
CREATE INDEX "AiConversation_promptKey_idx" ON "ai_schema"."AiConversation"("promptKey");
CREATE INDEX "AiConversation_promptVersionId_idx" ON "ai_schema"."AiConversation"("promptVersionId");

-- CreateIndex
CREATE INDEX "AiMessage_conversationId_idx" ON "ai_schema"."AiMessage"("conversationId");
CREATE INDEX "AiMessage_userId_idx" ON "ai_schema"."AiMessage"("userId");

-- CreateIndex
CREATE INDEX "AiUsageEvent_userId_idx" ON "ai_schema"."AiUsageEvent"("userId");
CREATE INDEX "AiUsageEvent_conversationId_idx" ON "ai_schema"."AiUsageEvent"("conversationId");
CREATE INDEX "AiUsageEvent_promptKey_idx" ON "ai_schema"."AiUsageEvent"("promptKey");
CREATE INDEX "AiUsageEvent_status_idx" ON "ai_schema"."AiUsageEvent"("status");

-- AddForeignKey
ALTER TABLE "ai_schema"."AiPrompt" ADD CONSTRAINT "AiPrompt_activeVersionId_fkey" FOREIGN KEY ("activeVersionId") REFERENCES "ai_schema"."AiPromptVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ai_schema"."AiPromptVersion" ADD CONSTRAINT "AiPromptVersion_promptId_fkey" FOREIGN KEY ("promptId") REFERENCES "ai_schema"."AiPrompt"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ai_schema"."AiPromptVersion" ADD CONSTRAINT "AiPromptVersion_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "user_schema"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ai_schema"."AiConversation" ADD CONSTRAINT "AiConversation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user_schema"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ai_schema"."AiConversation" ADD CONSTRAINT "AiConversation_promptVersionId_fkey" FOREIGN KEY ("promptVersionId") REFERENCES "ai_schema"."AiPromptVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ai_schema"."AiMessage" ADD CONSTRAINT "AiMessage_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "ai_schema"."AiConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ai_schema"."AiMessage" ADD CONSTRAINT "AiMessage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user_schema"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ai_schema"."AiUsageEvent" ADD CONSTRAINT "AiUsageEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user_schema"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ai_schema"."AiUsageEvent" ADD CONSTRAINT "AiUsageEvent_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "ai_schema"."AiConversation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ai_schema"."AiUsageEvent" ADD CONSTRAINT "AiUsageEvent_promptVersionId_fkey" FOREIGN KEY ("promptVersionId") REFERENCES "ai_schema"."AiPromptVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;
