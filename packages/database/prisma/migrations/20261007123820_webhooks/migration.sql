-- CreateTable
CREATE TABLE "user_schema"."WebhookEndpoint" (
    "id" TEXT NOT NULL,
    "ownerUserId" TEXT,
    "organizationId" TEXT,
    "url" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "secretEncrypted" TEXT NOT NULL,
    "secretPrefix" TEXT NOT NULL,
    "previousSecretEncrypted" TEXT,
    "previousSecretExpiresAt" TIMESTAMP(3),
    "events" TEXT[],
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "disabledReason" TEXT,
    "consecutiveFailures" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WebhookEndpoint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_schema"."WebhookDelivery" (
    "id" TEXT NOT NULL,
    "endpointId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "attempt" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "responseCode" INTEGER,
    "durationMs" INTEGER,
    "error" TEXT,
    "nextAttemptAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WebhookDelivery_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WebhookEndpoint_ownerUserId_idx" ON "user_schema"."WebhookEndpoint"("ownerUserId");

-- CreateIndex
CREATE INDEX "WebhookEndpoint_organizationId_idx" ON "user_schema"."WebhookEndpoint"("organizationId");

-- CreateIndex
CREATE INDEX "WebhookDelivery_endpointId_createdAt_idx" ON "user_schema"."WebhookDelivery"("endpointId", "createdAt");

-- AddForeignKey
ALTER TABLE "user_schema"."WebhookEndpoint" ADD CONSTRAINT "WebhookEndpoint_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "user_schema"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_schema"."WebhookDelivery" ADD CONSTRAINT "WebhookDelivery_endpointId_fkey" FOREIGN KEY ("endpointId") REFERENCES "user_schema"."WebhookEndpoint"("id") ON DELETE CASCADE ON UPDATE CASCADE;
