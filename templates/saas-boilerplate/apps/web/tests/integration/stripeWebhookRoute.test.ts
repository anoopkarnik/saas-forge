// @vitest-environment node
import Stripe from "stripe";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { db, tx, signature } = vi.hoisted(() => {
  const tx = {
    transaction: { findFirst: vi.fn(), create: vi.fn() },
    user: { update: vi.fn() },
  };
  const db = {
    transaction: { findFirst: vi.fn() },
    $transaction: vi.fn(async (run: (client: typeof tx) => Promise<unknown>) => run(tx)),
  };
  return { db, tx, signature: { value: "" } };
});

vi.mock("@workspace/database/client", () => ({ default: db }));
vi.mock("next/headers", () => ({
  headers: async () => new Headers({ "Stripe-Signature": signature.value }),
}));

import { POST } from "@/app/api/payments/stripe/webhook/route";

const SECRET = "whsec_test_secret";
const stripe = new Stripe("sk_test_dummy");

function signedRequest(event: object, secret = SECRET) {
  const payload = JSON.stringify(event);
  signature.value = stripe.webhooks.generateTestHeaderString({ payload, secret });
  return { text: async () => payload } as never;
}

const completed = {
  id: "evt_1",
  type: "checkout.session.completed",
  data: {
    object: {
      id: "cs_test_1",
      client_reference_id: "user_1",
      metadata: { credits: "100" },
      amount_total: 200,
      currency: "usd",
      payment_intent: null,
    },
  },
};

describe("POST /api/payments/stripe/webhook", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_dummy");
    vi.stubEnv("STRIPE_WEBHOOK_SECRET", SECRET);
  });

  it("rejects a payload whose signature does not match", async () => {
    const response = await POST(signedRequest(completed, "whsec_someone_else"));
    expect(response.status).toBe(400);
    expect(db.$transaction).not.toHaveBeenCalled();
  });

  it("adds the purchased credits once the checkout completes", async () => {
    db.transaction.findFirst.mockResolvedValue(null);
    tx.transaction.findFirst.mockResolvedValue(null);

    const response = await POST(signedRequest(completed));

    expect(response.status).toBe(200);
    expect(tx.transaction.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ userId: "user_1", eventId: "evt_1", checkoutSessionId: "cs_test_1", amount: 200 }),
    });
    expect(tx.user.update).toHaveBeenCalledWith({
      where: { id: "user_1" },
      data: { creditsTotal: { increment: 100 } },
    });
  });

  it("ignores a checkout session it already processed", async () => {
    db.transaction.findFirst.mockResolvedValue({ id: "tx_1" });

    const response = await POST(signedRequest(completed));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ message: "Event already processed" });
    expect(db.$transaction).not.toHaveBeenCalled();
  });
});
