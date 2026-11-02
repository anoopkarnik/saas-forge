import { beforeEach, describe, expect, it, vi } from "vitest";
import type { FlagEvaluator } from "../evaluator";

const { db, tx } = vi.hoisted(() => {
  const tx = {
    featureFlag: { upsert: vi.fn() },
    featureFlagChange: { create: vi.fn() },
  };
  const db = {
    featureFlag: { findUnique: vi.fn(), findMany: vi.fn() },
    $transaction: vi.fn(async (run: (tx: unknown) => Promise<unknown>) =>
      run(tx),
    ),
  };
  return { db, tx };
});
vi.mock("@workspace/database/client", () => ({ default: db }));

import { createFlagService } from "../service";

const definitions = { search: { description: "New search", default: false } };
const evaluator: FlagEvaluator<"search"> = {
  evaluateFlags: vi.fn(),
  isEnabled: vi.fn(),
  sessionSubject: vi.fn(),
  invalidateFlagCache: vi.fn(),
};

beforeEach(() => {
  vi.resetAllMocks();
  db.featureFlag.findUnique.mockResolvedValue(null);
  db.featureFlag.findMany.mockResolvedValue([
    { key: "search", enabled: true, rules: [], updatedAt: new Date(0) },
  ]);
  db.$transaction.mockImplementation(async (run) => run(tx));
});

describe("flag service update hook boundary", () => {
  it("runs the host hook in the same transaction, then invalidates only after commit", async () => {
    const order: string[] = [];
    tx.featureFlag.upsert.mockImplementation(async () => {
      order.push("flag");
    });
    tx.featureFlagChange.create.mockImplementation(async () => {
      order.push("history");
    });
    db.$transaction.mockImplementation(async (run) => {
      order.push("begin");
      const result = await run(tx);
      order.push("commit");
      return result;
    });
    vi.mocked(evaluator.invalidateFlagCache).mockImplementation(async () => {
      order.push("invalidate");
    });
    const hook = vi.fn(async () => {
      order.push("hook");
    });
    const headers = new Headers({ "x-request-id": "request1" });
    const service = createFlagService(definitions, evaluator, hook);

    expect(
      await service.updateFlag("search", { enabled: true }, "admin1", headers),
    ).toMatchObject({ key: "search", enabled: true, stored: true });
    expect(hook).toHaveBeenCalledWith(tx, {
      key: "search",
      enabled: true,
      rules: 0,
      actorId: "admin1",
      headers,
    });
    expect(order).toEqual([
      "begin",
      "flag",
      "history",
      "hook",
      "commit",
      "invalidate",
    ]);
  });

  it("propagates hook failure through the transaction without invalidating or returning a saved flag", async () => {
    const error = new Error("audit write failed");
    const hook = vi.fn(async () => {
      throw error;
    });
    const service = createFlagService(definitions, evaluator, hook);
    let committed = false;
    db.$transaction.mockImplementation(async (run) => {
      const result = await run(tx);
      committed = true;
      return result;
    });

    await expect(
      service.updateFlag("search", { enabled: true }, "admin1"),
    ).rejects.toBe(error);
    expect(hook).toHaveBeenCalledWith(
      tx,
      expect.objectContaining({ key: "search", actorId: "admin1" }),
    );
    expect(committed).toBe(false);
    expect(evaluator.invalidateFlagCache).not.toHaveBeenCalled();
    expect(db.featureFlag.findMany).not.toHaveBeenCalled();
  });
});
