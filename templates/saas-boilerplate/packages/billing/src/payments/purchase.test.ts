import { beforeEach, describe, expect, it, vi } from "vitest";
const { db, tx } = vi.hoisted(() => {
  const tx = {
    transaction: { findFirst: vi.fn(), create: vi.fn() },
    user: { update: vi.fn() },
  };
  return {
    tx,
    db: {
      transaction: { findFirst: vi.fn() },
      $transaction: vi.fn(async (run: (tx: unknown) => Promise<unknown>) =>
        run(tx),
      ),
    },
  };
});
vi.mock("@workspace/database/client", () => ({ default: db }));
import { recordCreditPurchase } from "./purchase";
const purchase = {
  userId: "u1",
  credits: 100,
  eventId: "evt1",
  checkoutSessionId: "checkout1",
  amount: 500,
  currency: "USD",
};
beforeEach(() => {
  vi.resetAllMocks();
  db.transaction.findFirst.mockResolvedValue(null);
  tx.transaction.findFirst.mockResolvedValue(null);
  db.$transaction.mockImplementation(async (run) => run(tx));
});
describe("recordCreditPurchase", () => {
  it("records a purchase and credits together, resolving the receipt in its transaction", async () => {
    const receipt = vi.fn(async () => {
      expect(tx.transaction.findFirst).toHaveBeenCalled();
      expect(tx.transaction.create).not.toHaveBeenCalled();
      return "https://receipt.test/one";
    });
    expect(await recordCreditPurchase(purchase, receipt)).toBe(true);
    expect(tx.transaction.create).toHaveBeenCalledWith({
      data: {
        userId: "u1",
        eventId: "evt1",
        checkoutSessionId: "checkout1",
        receiptUrl: "https://receipt.test/one",
        description: "Credit Purchase",
        amount: 500,
        currency: "USD",
      },
    });
    expect(tx.user.update).toHaveBeenCalledWith({
      where: { id: "u1" },
      data: { creditsTotal: { increment: 100 } },
    });
  });
  it("does not credit a duplicate detected before starting a transaction", async () => {
    db.transaction.findFirst.mockResolvedValue({ id: "existing" });
    expect(await recordCreditPurchase(purchase)).toBe(false);
    expect(db.$transaction).not.toHaveBeenCalled();
  });
  it("does not credit a duplicate found by the in-transaction check", async () => {
    tx.transaction.findFirst.mockResolvedValue({ id: "existing" });
    expect(await recordCreditPurchase(purchase)).toBe(false);
    expect(tx.transaction.create).not.toHaveBeenCalled();
    expect(tx.user.update).not.toHaveBeenCalled();
  });
  it("treats a unique-key collision as an already processed payment", async () => {
    tx.transaction.create.mockRejectedValue({ code: "P2002" });
    expect(await recordCreditPurchase(purchase)).toBe(false);
    expect(tx.user.update).not.toHaveBeenCalled();
  });
  it("propagates a failed balance update so the database rolls back the purchase", async () => {
    const failure = new Error("database unavailable");
    tx.user.update.mockRejectedValue(failure);
    await expect(recordCreditPurchase(purchase)).rejects.toBe(failure);
  });
});
