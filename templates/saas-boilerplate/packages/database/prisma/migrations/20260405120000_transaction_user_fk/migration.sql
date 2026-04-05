-- CreateIndex
CREATE INDEX "Transaction_userId_idx" ON "billing_schema"."Transaction"("userId");

-- AddForeignKey
ALTER TABLE "billing_schema"."Transaction"
ADD CONSTRAINT "Transaction_userId_fkey"
FOREIGN KEY ("userId")
REFERENCES "user_schema"."User"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;
