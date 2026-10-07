// @vitest-environment node
/* eslint-disable @typescript-eslint/no-explicit-any -- loose in-memory Prisma fakes */
import { beforeEach, describe, expect, it, vi } from "vitest";

// In-memory User, UsageEvent, UsageAlert and Transaction tables with their unique keys.
const { db, store } = vi.hoisted(() => {
  const store = {
    users: new Map<string, { creditsTotal: number; creditsUsed: number }>(),
    events: [] as any[],
    alerts: [] as any[],
    transactions: [] as any[],
  };
  let seq = 0;
  const matchEvent = (row: any, where: any) =>
    (!where?.userId || row.userId === where.userId) &&
    (!where?.occurredAt?.gte || row.occurredAt >= where.occurredAt.gte) &&
    (!where?.NOT?.meter || row.meter !== where.NOT.meter);
  const byNewest = (a: any, b: any) => b.occurredAt - a.occurredAt || (a.id < b.id ? 1 : -1);
  const db: any = {
    user: {
      findUnique: vi.fn(async ({ where }: any) => {
        const user = store.users.get(where.id);
        return user ? { ...user } : null;
      }),
      update: vi.fn(async ({ where, data }: any) => {
        const user = store.users.get(where.id)!;
        user.creditsUsed += data.creditsUsed.increment;
        return user;
      }),
      findMany: vi.fn(async ({ where }: any) =>
        where.id.in.map((id: string) => ({ id, creditsUsed: store.users.get(id)!.creditsUsed })),
      ),
    },
    usageEvent: {
      createMany: vi.fn(async ({ data }: any) => {
        let count = 0;
        for (const row of data) {
          if (store.events.some((e) => e.idempotencyKey === row.idempotencyKey)) continue;
          store.events.push({ id: `ev${String(++seq).padStart(3, "0")}`, occurredAt: row.occurredAt ?? new Date(), sourceId: null, ...row });
          count++;
        }
        return { count };
      }),
      findFirst: vi.fn(async ({ where }: any) => store.events.find((row) => matchEvent(row, where)) ?? null),
      findMany: vi.fn(async ({ where, take }: any) => store.events.filter((row) => matchEvent(row, where)).sort(byNewest).slice(0, take)),
      groupBy: vi.fn(async () => {
        const sums = new Map<string, number>();
        for (const row of store.events) sums.set(row.userId, (sums.get(row.userId) ?? 0) + row.credits);
        return [...sums].map(([userId, credits]) => ({ userId, _sum: { credits } }));
      }),
    },
    usageAlert: {
      createMany: vi.fn(async ({ data }: any) => {
        let count = 0;
        for (const row of data) {
          const key = (a: any) => `${a.userId}|${a.threshold}|${a.cycle}`;
          if (store.alerts.some((a) => key(a) === key(row))) continue;
          store.alerts.push({ ...row, createdAt: new Date() });
          count++;
        }
        return { count };
      }),
      findFirst: vi.fn(async ({ where }: any) =>
        store.alerts.filter((a) => a.userId === where.userId && a.cycle === where.cycle).sort((a, b) => b.threshold - a.threshold)[0] ?? null,
      ),
    },
    transaction: {
      findMany: vi.fn(async ({ where }: any) => store.transactions.filter((t) => t.userId === where.userId)),
    },
  };
  return { db, store };
});
vi.mock("@workspace/database/client", () => ({ default: db }));
vi.mock("@workspace/auth/better-auth/auth", () => ({ auth: { api: { getSession: vi.fn() } } }));
// scaffold:begin notifications
vi.mock("@/lib/notifications/notify", () => ({ notify: vi.fn(async () => true) }));
// scaffold:end notifications

import { announceUsageAlerts, logUsage, recordUsage } from "@/lib/usage/record";
import { balanceLedger, dailyUsage, findUsageDrift, usageSummary } from "@/lib/usage/service";
// scaffold:begin notifications
import { notify } from "@/lib/notifications/notify";
// scaffold:end notifications

const charge = (credits: number, key: string, meter = "ai.tokens") =>
  recordUsage(db, { userId: "u1", meter, quantity: credits * 1000, credits, sourceType: "test", idempotencyKey: key });

beforeEach(() => {
  store.users.clear();
  store.users.set("u1", { creditsTotal: 100, creditsUsed: 0 });
  store.events.length = 0;
  store.alerts.length = 0;
  store.transactions.length = 0;
  vi.clearAllMocks();
});

describe("recordUsage", () => {
  it("a retried request with the same idempotency key charges once", async () => {
    expect((await charge(3, "ai:req-1")).charged).toBe(true);
    expect((await charge(3, "ai:req-1")).charged).toBe(false);
    expect(store.users.get("u1")!.creditsUsed).toBe(3);
    expect(store.events.filter((e) => e.meter === "ai.tokens")).toHaveLength(1);
  });

  it("opens the ledger with earlier spend, so events add up to creditsUsed", async () => {
    store.users.get("u1")!.creditsUsed = 7;
    await charge(3, "k1");
    await charge(2, "k2");
    expect(store.events.map((e) => [e.meter, e.credits])).toEqual([
      ["balance.opening", 7],
      ["ai.tokens", 3],
      ["ai.tokens", 2],
    ]);
    expect(await findUsageDrift()).toEqual([]);
  });

  it("reports drift when creditsUsed moved outside the ledger", async () => {
    await charge(3, "k1");
    store.users.get("u1")!.creditsUsed += 4;
    expect(await findUsageDrift()).toEqual([{ userId: "u1", creditsUsed: 7, ledger: 3 }]);
  });

  it("crossing 80% alerts once per credit cycle; 95% alerts separately", async () => {
    store.users.get("u1")!.creditsUsed = 75;
    expect((await charge(6, "a")).alerts).toEqual([{ percent: 80, remaining: 19 }]);
    expect((await charge(1, "b")).alerts).toEqual([]);
    expect((await charge(13, "c")).alerts).toEqual([{ percent: 95, remaining: 5 }]);

    // A purchase starts a new cycle (creditsTotal changes): 80% of 200 alerts again.
    store.users.get("u1")!.creditsTotal = 200;
    store.users.get("u1")!.creditsUsed = 155;
    expect((await charge(5, "d")).alerts).toEqual([{ percent: 80, remaining: 40 }]);
    expect(store.alerts).toHaveLength(3);
  });

  // scaffold:begin notifications
  it("announces alerts through notifications", async () => {
    await announceUsageAlerts("u1", [{ percent: 80, remaining: 19 }]);
    expect(notify).toHaveBeenCalledWith(expect.objectContaining({ type: "usage.threshold" }), "u1", { percent: 80, remaining: 19 }, expect.anything());
  });
  // scaffold:end notifications
});

describe("logUsage", () => {
  it("records spend a caller already applied (scaffold downloads and refunds)", async () => {
    store.users.get("u1")!.creditsUsed = 10; // 5 earlier + 5 just charged by the caller
    await logUsage(db, { userId: "u1", meter: "scaffold.download", quantity: 1, credits: 5, sourceType: "scaffold_job", sourceId: "j1", idempotencyKey: "scaffold:j1" });
    store.users.get("u1")!.creditsUsed = 5; // the caller refunds the job
    await logUsage(db, { userId: "u1", meter: "scaffold.refund", quantity: 1, credits: -5, sourceType: "scaffold_job", sourceId: "j1", idempotencyKey: "scaffold-refund:j1" });

    expect(store.events.map((e) => [e.meter, e.credits])).toEqual([
      ["balance.opening", 5],
      ["scaffold.download", 5],
      ["scaffold.refund", -5],
    ]);
    expect(await findUsageDrift()).toEqual([]);
  });
});

describe("dashboard", () => {
  it("sums credits per day and meter, without the opening balance", async () => {
    store.users.get("u1")!.creditsUsed = 4;
    await charge(3, "k1");
    await logUsage(db, { userId: "u1", meter: "scaffold.download", quantity: 1, credits: 2, sourceType: "x", idempotencyKey: "k2" });
    const { meters, days } = await dailyUsage("u1", 30);
    expect(days).toHaveLength(30);
    expect(meters.map((m) => m.meter)).toEqual(["ai.tokens", "scaffold.download"]);
    expect(days.at(-1)).toMatchObject({ "ai.tokens": 3, "scaffold.download": 2 });
    expect(meters.find((m) => m.meter === "scaffold.download")!.label).toBe("Scaffold download");
  });

  it("explains the balance with purchases and usage, newest first", async () => {
    store.transactions.push({ id: "t1", userId: "u1", date: new Date(Date.now() - 60_000), description: "100 credits", amount: 500, currency: "usd" });
    await charge(3, "k1");
    const ledger = await balanceLedger("u1");
    expect(ledger.map((entry) => entry.kind)).toEqual(["usage", "purchase"]);
    expect(ledger[1]).toMatchObject({ label: "100 credits", amount: 500 });
  });

  it("shows the highest threshold reached in the current cycle", async () => {
    store.users.get("u1")!.creditsUsed = 79;
    await charge(2, "k1");
    expect(await usageSummary("u1")).toMatchObject({ remaining: 19, alert: { threshold: 80 } });
  });
});
