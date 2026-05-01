ALTER TABLE "ai_schema"."AiPromptVersion" ALTER COLUMN "content" DROP NOT NULL;

CREATE TABLE "ai_schema"."AiWebhookConfig" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL DEFAULT 'default',
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "url" TEXT NOT NULL,
    "apiKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiWebhookConfig_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AiWebhookConfig_key_key" ON "ai_schema"."AiWebhookConfig"("key");
