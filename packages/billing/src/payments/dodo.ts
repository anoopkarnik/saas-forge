import { recordCreditPurchase } from "./purchase";
// scaffold:begin notifications
import {
  paymentFailed,
  paymentSucceeded,
} from "@workspace/notifications/catalog";
import { notify } from "@workspace/notifications/notify";
// scaffold:end notifications
// scaffold:begin webhooks
import { emitWebhook } from "@workspace/webhooks/service";
// scaffold:end webhooks
// scaffold:begin analytics
import { track } from "@workspace/analytics/server";
// scaffold:end analytics

/** The Dodo HTTP adapter validates the signature before invoking these callbacks. */
export type DodoPaymentPayload = {
  data?: {
    payment_id?: string;
    metadata?: { credits?: string; userId?: string } | null;
    settlement_currency?: string;
    total_amount?: number;
    error_message?: string | null;
  };
};

export async function processDodoPaymentFailed(
  payload: DodoPaymentPayload,
): Promise<void> {
  const userId = payload.data?.metadata?.userId;
  const eventId = payload.data?.payment_id;
  console.log("[Dodo Webhook] Payment failed:", eventId);
  // scaffold:begin notifications
  if (userId && eventId)
    await notify(
      paymentFailed,
      userId,
      { reason: payload.data?.error_message ?? undefined },
      { dedupeKey: `payment-failed:${eventId}` },
    );
  // scaffold:end notifications
  // scaffold:begin webhooks
  if (userId)
    await emitWebhook(
      "payment.failed",
      { userId, reason: payload.data?.error_message ?? null },
      { userId },
    );
  // scaffold:end webhooks
}

/** True tells the app to invalidate its credit-balance cache after commit. */
export async function processDodoPaymentSucceeded(
  payload: DodoPaymentPayload,
  invoiceBaseUrl: string | undefined,
): Promise<boolean> {
  const credits = payload.data?.metadata?.credits;
  const userId = payload.data?.metadata?.userId;
  const currency = payload.data?.settlement_currency;
  const amount = payload.data?.total_amount;
  const eventId = payload.data?.payment_id;
  if (!credits || !userId || !eventId) throw new Error("Invalid payload");
  const applied = await recordCreditPurchase(
    {
      userId,
      credits: Number(credits),
      eventId,
      checkoutSessionId: eventId,
      amount: Number(amount),
      currency: currency!,
    },
    async () => `${invoiceBaseUrl}/invoices/payments/${eventId}`,
  );
  if (!applied) return false;
  // scaffold:begin notifications
  await notify(
    paymentSucceeded,
    userId,
    { credits: Number(credits) },
    { dedupeKey: `payment:${eventId}` },
  );
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
  // scaffold:begin analytics
  await track(
    "billing.checkout_completed",
    { credits: Number(credits), gateway: "dodo" },
    { distinctId: userId },
  );
  // scaffold:end analytics
  return true;
}
