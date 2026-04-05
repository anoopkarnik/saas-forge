/*
  Warnings:

  - A unique constraint covering the columns `[checkoutSessionId]` on the table `Transaction` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "billing_schema"."Transaction" ADD COLUMN     "checkoutSessionId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Transaction_checkoutSessionId_key" ON "billing_schema"."Transaction"("checkoutSessionId");
