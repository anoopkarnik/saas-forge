-- CreateTable
CREATE TABLE "ai_schema"."AiSpeechConfig" (
    "id" TEXT NOT NULL,
    "capability" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'custom',
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "url" TEXT NOT NULL,
    "sampleBody" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiSpeechConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AiSpeechConfig_capability_key" ON "ai_schema"."AiSpeechConfig"("capability");
