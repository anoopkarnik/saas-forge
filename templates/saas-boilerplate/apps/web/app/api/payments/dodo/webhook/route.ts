import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import db  from "@workspace/database/client";
// scaffold:begin notifications
import { paymentFailed, paymentSucceeded } from "@/lib/notifications/catalog";
import { notify } from "@/lib/notifications/notify";
// scaffold:end notifications
// scaffold:begin webhooks
import { emitWebhook } from "@/lib/webhooks/service";
// scaffold:end webhooks

export async function POST(req: NextRequest) {

  // Conditionally initialize webhooks only when DODO_PAYMENTS_WEBHOOK_KEY is configured
  let webhookHandler: ((req: NextRequest) => Promise<NextResponse>) | null = null;


  if (process.env.DODO_PAYMENTS_WEBHOOK_KEY) {
    const { Webhooks } = await import("@dodopayments/nextjs");
    webhookHandler = Webhooks({
      webhookKey: process.env.DODO_PAYMENTS_WEBHOOK_KEY,
      onSubscriptionActive: async (payload: any) => {
        console.log("Received onSubscriptionActive webhook:", payload);
        // Add your business logic here
      },
      onPaymentFailed: async (payload: any) => {
        console.log("[Dodo Webhook] Payment failed:", payload?.data?.payment_id);
        // scaffold:begin notifications
        if (payload?.data?.metadata?.userId && payload?.data?.payment_id) {
          await notify(
            paymentFailed,
            payload.data.metadata.userId,
            { reason: payload.data.error_message ?? undefined },
            { dedupeKey: `payment-failed:${payload.data.payment_id}` },
          );
        }
        // scaffold:end notifications
        // scaffold:begin webhooks
        if (payload?.data?.metadata?.userId) {
          await emitWebhook(
            "payment.failed",
            { userId: payload.data.metadata.userId, reason: payload.data.error_message ?? null },
            { userId: payload.data.metadata.userId },
          );
        }
        // scaffold:end webhooks
      },
      onPaymentSucceeded: async (payload: any) => {
        const credits = payload?.data?.metadata?.credits;
        const userId = payload?.data?.metadata?.userId;
        const currency = payload?.data?.settlement_currency;
        const amount = payload?.data?.total_amount;
        const eventId = payload?.data?.payment_id;

        if (!credits || !userId || !eventId) {
          throw new Error("Invalid payload");
        }

        console.log(`[Dodo Webhook] Payment: ${eventId}, User: ${userId}, Credits: ${credits}`);

        // Quick check outside transaction (fast path for known duplicates)
        const existingTx = await db.transaction.findFirst({
            where: { checkoutSessionId: eventId }
        });

        if (existingTx) {
            console.log(`[Dodo Webhook] Duplicate payment ignored (fast path): ${eventId}`);
            return;
        }

        try {
          await db.$transaction(async (tx: any) => {
            // Re-check INSIDE the transaction to prevent TOCTOU race condition
            const alreadyProcessed = await tx.transaction.findFirst({
              where: { checkoutSessionId: eventId }
            });
            if (alreadyProcessed) {
              console.log(`[Dodo Webhook] Duplicate payment ignored (inside tx): ${eventId}`);
              return; // exits the transaction callback without creating anything
            }

            await tx.transaction.create({
              data: {
                userId,
                eventId: eventId,
                checkoutSessionId: eventId,
                receiptUrl: `${process.env.NEXT_PUBLIC_DODO_PAYMENTS_URL}/invoices/payments/${eventId}`,
                description: "Credit Purchase",
                amount: Number(amount),
                currency: currency,
              },
            });

            await tx.user.update({
              where: {
                id: userId,
              },
              data: {
                creditsTotal: {
                  increment: Number(credits),
                },
              },
            });

            console.log(`[Dodo Webhook] Credits +${credits} for user ${userId} (payment: ${eventId})`);
          });
        } catch (error: any) {
          // P2002 = unique constraint on checkoutSessionId — ultimate race condition fallback
          if (error?.code === 'P2002') {
            console.log(`[Dodo Webhook] Race condition caught (P2002) — duplicate payment: ${eventId}`);
            return;
          }
          console.error("[Dodo Webhook] Error processing webhook:", error);
          throw error;
        }

        // scaffold:begin notifications
        await notify(paymentSucceeded, userId, { credits: Number(credits) }, { dedupeKey: `payment:${eventId}` });
        // scaffold:end notifications
        // scaffold:begin webhooks
        await emitWebhook(
          "payment.succeeded",
          {
            userId,
            credits: Number(credits),
            amount: amount == null ? null : Number(amount),
            currency: currency ?? null,
            checkoutId: eventId,
          },
          { userId },
        );
        // scaffold:end webhooks

        // Revalidate the entire layout cache so updated credits show immediately everywhere
        revalidatePath("/", "layout");
      },
    });
  }

  if (!webhookHandler) {
    return NextResponse.json(
      { error: "Payment gateway is not configured" },
      { status: 503 }
    );
  }
  return webhookHandler(req);
}
