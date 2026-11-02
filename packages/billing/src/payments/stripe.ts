import type Stripe from "stripe";
import { getStripeClient } from "../providers/stripe";
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

export type PaymentResult = {
  status: number;
  body: { message: string } | { error: string };
};

/** Processes an event only after the HTTP adapter verified Stripe's signature. */
export async function processStripeEvent(
  event: Stripe.Event,
): Promise<PaymentResult> {
  const session = event.data.object as Stripe.Checkout.Session;
  console.log(
    `[Stripe Webhook] Event: ${event.type}, ID: ${event.id}, Session: ${session.id}`,
  );
  if (event.type === "checkout.session.completed") {
    const credits = Number(session.metadata?.["credits"]);
    const userId = session.client_reference_id;
    if (!credits || !userId)
      return { status: 400, body: { error: "Missing userId or credits" } };
    try {
      const applied = await recordCreditPurchase(
        {
          userId,
          credits,
          eventId: event.id,
          checkoutSessionId: session.id,
          amount: Number(session.amount_total),
          currency: session.currency || "USD",
        },
        async () => {
          try {
            if (session.payment_intent) {
              const paymentIntent =
                await getStripeClient().paymentIntents.retrieve(
                  session.payment_intent as string,
                  { expand: ["latest_charge"] },
                );
              return (
                (paymentIntent.latest_charge as Stripe.Charge)?.receipt_url ??
                null
              );
            }
          } catch (error) {
            console.warn(
              `[Stripe Webhook] Could not retrieve receipt URL for session ${session.id}:`,
              error,
            );
          }
          return null;
        },
      );
      if (!applied)
        return { status: 200, body: { message: "Event already processed" } };
      // scaffold:begin notifications
      await notify(
        paymentSucceeded,
        userId,
        { credits },
        { dedupeKey: `payment:${session.id}` },
      );
      // scaffold:end notifications
      // scaffold:begin webhooks
      await emitWebhook(
        "payment.succeeded",
        {
          userId,
          credits,
          amount: session.amount_total ?? null,
          currency: session.currency ?? null,
          checkoutId: session.id,
        },
        { userId },
      );
      // scaffold:end webhooks
      // scaffold:begin analytics
      await track(
        "billing.checkout_completed",
        { credits, gateway: "stripe" },
        { distinctId: userId },
      );
      // scaffold:end analytics
      return {
        status: 200,
        body: { message: "Checkout session completed and credits updated" },
      };
    } catch (error) {
      console.error("[Stripe Webhook] Error processing payment:", error);
      return { status: 500, body: { error: "Failed to process payment" } };
    }
  }
  if (
    event.type === "checkout.session.async_payment_failed" &&
    session.client_reference_id
  ) {
    // scaffold:begin notifications
    await notify(
      paymentFailed,
      session.client_reference_id,
      {},
      { dedupeKey: `payment-failed:${session.id}` },
    );
    // scaffold:end notifications
    // scaffold:begin webhooks
    await emitWebhook(
      "payment.failed",
      { userId: session.client_reference_id, reason: null },
      { userId: session.client_reference_id },
    );
    // scaffold:end webhooks
    return { status: 200, body: { message: "Payment failure recorded" } };
  }
  return {
    status: 200,
    body: { message: "Stripe webhook received but not processed" },
  };
}
