import { describe, it, expect, vi, beforeEach } from "vitest";

const { db, state } = vi.hoisted(() => {
  const state = {
    creditsUsed: 0,
    creditsTotal: 100,
    jobs: new Map<string, any>(),
    updateCalled: false,
    txCalled: false,
    lastJobData: null as any,
  };
  const tx = {
    user: {
      findUniqueOrThrow: async () => ({
        creditsUsed: state.creditsUsed,
        creditsTotal: state.creditsTotal,
      }),
      update: async ({ data }: any) => {
        state.updateCalled = true;
        state.creditsUsed = data.creditsUsed;
        return {};
      },
    },
    scaffoldJob: {
      create: async ({ data }: any) => {
        state.lastJobData = data;
        const id = "job1";
        if (data.idempotencyKey)
          state.jobs.set(data.idempotencyKey, { id, creditsSpent: data.creditsSpent });
        return { id };
      },
    },
  };
  const db = {
    $transaction: async (cb: any) => {
      state.txCalled = true;
      return cb(tx);
    },
    scaffoldJob: {
      findUnique: async ({ where }: any) => state.jobs.get(where.idempotencyKey) ?? null,
    },
  };
  return { db, state };
});

vi.mock("@workspace/database/client", () => ({ default: db }));

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  chargeScaffoldCredits,
  InsufficientCreditsError,
  computeUpgradeDelta,
  diffTrees,
} from "../service";

const job = {
  type: "download" as const,
  source: "api" as const,
  projectId: "p1",
  toModules: ["billing"],
  toTierId: "tier-1",
  templateVersion: "1.4.1",
};

describe("chargeScaffoldCredits", () => {
  beforeEach(() => {
    state.creditsUsed = 0;
    state.creditsTotal = 100;
    state.jobs.clear();
    state.updateCalled = false;
    state.txCalled = false;
    state.lastJobData = null;
  });

  it("charges credits and records a job", async () => {
    const res = await chargeScaffoldCredits({ userId: "u1", amount: 30, job });
    expect(res).toMatchObject({ charged: 30, alreadyProcessed: false });
    expect(state.creditsUsed).toBe(30);
    expect(state.updateCalled).toBe(true);
    expect(state.lastJobData.creditsSpent).toBe(30);
  });

  it("throws InsufficientCreditsError without charging", async () => {
    state.creditsTotal = 20;
    await expect(
      chargeScaffoldCredits({ userId: "u1", amount: 30, job }),
    ).rejects.toBeInstanceOf(InsufficientCreditsError);
    expect(state.updateCalled).toBe(false);
  });

  it("is idempotent — a repeated key returns the prior charge without re-charging", async () => {
    state.jobs.set("idem-1", { id: "prev", creditsSpent: 30 });
    const res = await chargeScaffoldCredits({
      userId: "u1",
      amount: 30,
      idempotencyKey: "idem-1",
      job,
    });
    expect(res).toMatchObject({ charged: 30, alreadyProcessed: true, jobId: "prev" });
    expect(state.txCalled).toBe(false);
    expect(state.updateCalled).toBe(false);
  });

  it("records a zero-cost job (free re-download) without touching the balance", async () => {
    const res = await chargeScaffoldCredits({ userId: "u1", amount: 0, job });
    expect(res.charged).toBe(0);
    expect(state.updateCalled).toBe(false);
    expect(state.lastJobData.creditsSpent).toBe(0);
  });
});

describe("computeUpgradeDelta", () => {
  it("prices added modules only", () => {
    const d = computeUpgradeDelta({
      fromModules: [],
      toModules: ["billing"],
      fromTierId: "tier-1",
      toTierId: "tier-1",
    });
    expect(d.addedModules).toEqual(["billing"]);
    expect(d.deltaCredits).toBe(10);
    expect(d.tierSteps).toBe(0);
  });

  it("adds tier-step credits on a tier bump", () => {
    const d = computeUpgradeDelta({
      fromModules: [],
      toModules: ["billing"],
      fromTierId: "tier-1",
      toTierId: "tier-3",
    });
    expect(d.tierSteps).toBe(2);
    expect(d.deltaCredits).toBe(16); // 10 + 2*3
  });

  it("charges 0 for a not-yet-implemented module", () => {
    const d = computeUpgradeDelta({
      fromModules: ["billing"],
      toModules: ["billing", "api_keys"],
      fromTierId: "tier-1",
      toTierId: "tier-1",
    });
    expect(d.addedModules).toEqual(["api_keys"]);
    expect(d.deltaCredits).toBe(0);
  });

  it("charges 50 credits to add Organizations / Teams", () => {
    const d = computeUpgradeDelta({
      fromModules: ["billing"],
      toModules: ["billing", "multi_tenancy"],
      fromTierId: "tier-1",
      toTierId: "tier-1",
    });
    expect(d.addedModules).toEqual(["multi_tenancy"]);
    expect(d.deltaCredits).toBe(50);
  });

  it("does not refund removed modules or tier downgrades", () => {
    const d = computeUpgradeDelta({
      fromModules: ["billing"],
      toModules: [],
      fromTierId: "tier-3",
      toTierId: "tier-1",
    });
    expect(d.removedModules).toEqual(["billing"]);
    expect(d.tierSteps).toBe(0);
    expect(d.deltaCredits).toBe(0);
  });
});

describe("diffTrees", () => {
  it("detects added, modified, and removed files", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "difftest-"));
    const a = path.join(root, "a");
    const b = path.join(root, "b");
    fs.mkdirSync(a);
    fs.mkdirSync(b);
    fs.writeFileSync(path.join(a, "same.txt"), "1");
    fs.writeFileSync(path.join(b, "same.txt"), "1");
    fs.writeFileSync(path.join(a, "changed.txt"), "old");
    fs.writeFileSync(path.join(b, "changed.txt"), "new");
    fs.writeFileSync(path.join(a, "gone.txt"), "x");
    fs.writeFileSync(path.join(b, "fresh.txt"), "y");
    try {
      const d = diffTrees(a, b);
      expect(d.added).toEqual(["fresh.txt"]);
      expect(d.modified).toEqual(["changed.txt"]);
      expect(d.removed).toEqual(["gone.txt"]);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
});
