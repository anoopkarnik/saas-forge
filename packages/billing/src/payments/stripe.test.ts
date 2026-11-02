import { beforeEach, describe, expect, it, vi } from "vitest";
import type Stripe from "stripe";

const { recordCreditPurchase } = vi.hoisted(() => ({
  recordCreditPurchase: vi.fn(),
}));
vi.mock("./purchase", () => ({ recordCreditPurchase }));
vi.mock("../providers/stripe", () => ({ getStripeClient: vi.fn() }));
// scaffold:begin notifications
const notify = vi.hoisted(() => vi.fn());
vi.mock("@workspace/notifications/catalog", () => ({
  paymentSucceeded: { type: "payment.succeeded" },
  paymentFailed: { type: "payment.failed" },
}));
vi.mock("@workspace/notifications/notify", () => ({ notify }));
// scaffold:end notifications
// scaffold:begin webhooks
const emitWebhook = vi.hoisted(() => vi.fn());
vi.mock("@workspace/webhooks/service", () => ({ emitWebhook }));
// scaffold:end webhooks
// scaffold:begin analytics
const track = vi.hoisted(() => vi.fn());
vi.mock("@workspace/analytics/server", () => ({ track }));
// scaffold:end analytics

import { processStripeEvent } from "./stripe";

const event = {
  id: "evt1",
  type: "checkout.session.completed",
  data: {
    object: {
      id: "cs1",
      client_reference_id: "u1",
      metadata: { credits: "100" },
      amount_total: 500,
      currency: "usd",
    },
  },
} as unknown as Stripe.Event;

beforeEach(() => vi.resetAllMocks());

describe("verified Stripe event processing", () => {
  it("emits payment effects only after a newly committed purchase", async () => {
    recordCreditPurchase.mockImplementation(async () => {
      // scaffold:begin notifications
      expect(notify).not.toHaveBeenCalled();
      // scaffold:end notifications
      // scaffold:begin webhooks
      expect(emitWebhook).not.toHaveBeenCalled();
      // scaffold:end webhooks
      return true;
    });
    expect(await processStripeEvent(event)).toEqual({
      status: 200,
      body: { message: "Checkout session completed and credits updated" },
    });
    // scaffold:begin notifications
    expect(notify).toHaveBeenCalledWith(
      { type: "payment.succeeded" },
      "u1",
      { credits: 100 },
      { dedupeKey: "payment:cs1" },
    );
    // scaffold:end notifications
    // scaffold:begin webhooks
    expect(emitWebhook).toHaveBeenCalledWith(
      "payment.succeeded",
      {
        userId: "u1",
        credits: 100,
        amount: 500,
        currency: "usd",
        checkoutId: "cs1",
      },
      { userId: "u1" },
    );
    // scaffold:end webhooks
  });

  it("suppresses downstream effects for a duplicate detected anywhere in persistence", async () => {
    recordCreditPurchase.mockResolvedValue(false);
    expect(await processStripeEvent(event)).toEqual({
      status: 200,
      body: { message: "Event already processed" },
    });
    // scaffold:begin notifications
    expect(notify).not.toHaveBeenCalled();
    // scaffold:end notifications
    // scaffold:begin webhooks
    expect(emitWebhook).not.toHaveBeenCalled();
    // scaffold:end webhooks
    // scaffold:begin analytics
    expect(track).not.toHaveBeenCalled();
    // scaffold:end analytics
  });

  it("returns a processing failure when the transaction did not commit", async () => {
    recordCreditPurchase.mockRejectedValue(new Error("database unavailable"));
    expect(await processStripeEvent(event)).toEqual({
      status: 500,
      body: { error: "Failed to process payment" },
    });
    // scaffold:begin notifications
    expect(notify).not.toHaveBeenCalled();
    // scaffold:end notifications
    // scaffold:begin webhooks
    expect(emitWebhook).not.toHaveBeenCalled();
    // scaffold:end webhooks
  });
});
