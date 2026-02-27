/*
  Warnings:

  - A unique constraint covering the columns `[eventId]` on the table `Transaction` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Transaction_eventId_key" ON "billing_schema"."Transaction"("eventId");
