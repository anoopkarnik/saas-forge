// @vitest-environment node
/* eslint-disable @typescript-eslint/no-explicit-any -- loose in-memory Prisma fakes */
import { beforeEach, describe, expect, it, vi } from "vitest";

// In-memory FeatureFlag / FeatureFlagChange tables plus the user and session rows previews read.
const { db, store, getSession } = vi.hoisted(() => {
  const store = { flags: new Map<string, any>(), changes: [] as any[], activeOrg: null as string | null };
  const db: any = {
    featureFlag: {
      findMany: vi.fn(async () => [...store.flags.values()]),
      findUnique: vi.fn(async ({ where }: any) => store.flags.get(where.key) ?? null),
      upsert: vi.fn(async ({ where, create, update }: any) => {
        const row = store.flags.get(where.key);
        store.flags.set(where.key, row ? { ...row, ...update, updatedAt: new Date() } : { ...create, updatedAt: new Date() });
      }),
    },
    featureFlagChange: {
      create: vi.fn(async ({ data }: any) => store.changes.push({ id: `c${store.changes.length}`, at: new Date(), ...data })),
      findMany: vi.fn(async ({ where }: any) => store.changes.filter((c) => c.flagKey === where.flagKey).reverse()),
    },
    user: {
      findFirst: vi.fn(async ({ where }: any) =>
        where.email === "ada@example.com" || where.id === "u-ada" ? { id: "u-ada", email: "ada@example.com", role: "user" } : null,
      ),
      findMany: vi.fn(async () => [{ id: "admin1", email: "admin@example.com" }]),
    },
    session: {
      findUnique: vi.fn(async () => ({ activeOrganizationId: store.activeOrg })),
      findFirst: vi.fn(async () => ({ id: "s-ada" })),
    },
    $transaction: vi.fn(async (run: (tx: any) => Promise<unknown>) => run(db)),
  };
  return { db, store, getSession: vi.fn(async () => null) };
});
vi.mock("@workspace/database/client", () => ({ default: db }));
vi.mock("@workspace/auth/better-auth/auth", () => ({ auth: { api: { getSession } } }));
vi.mock("next/headers", () => ({ headers: async () => new Headers(), cookies: async () => ({ get: () => undefined }) }));
// scaffold:begin audit_log
vi.mock("@/lib/audit/audit", () => ({ audit: vi.fn(async () => undefined), userActor: (userId: string) => ({ type: "user", userId }) }));
// scaffold:end audit_log

import { FLAGS } from "@/lib/flags/definitions";
import { isEnabled, requireFlag } from "@/lib/flags/flags";
import { bucket, evaluateFlag } from "@/lib/flags/rules";
import { updateFlag } from "@/lib/flags/service";
import { flagProcedure } from "@/trpc/flag-procedure";
import { createTRPCRouter } from "@/trpc/init";
import { flagsRouter } from "@/trpc/routers/flagsProcedures";

const KEY = "beta.dashboardWidgets" as const;
const ctxFor = (role: string, id = "u1") => ({
  headers: new Headers(),
  session: { user: { id, role, email: `${id}@example.com`, name: id }, session: { id: `s-${id}` } },
});

beforeEach(async () => {
  store.flags.clear();
  store.changes.length = 0;
  store.activeOrg = null;
  vi.clearAllMocks();
  vi.stubEnv("UPSTASH_REDIS_REST_URL", "");
  // Reset the evaluator's in-memory cache.
  await updateFlag(KEY, { enabled: FLAGS[KEY].default, rules: [] }, "setup");
  store.flags.clear();
  store.changes.length = 0;
});

describe("rules", () => {
  it("first matching rule wins, otherwise the flag's value", () => {
    const state = {
      enabled: false,
      rules: [
        { type: "user" as const, userIds: ["u-blocked"], value: false },
        { type: "role" as const, roles: ["admin"], value: true },
      ],
    };
    expect(evaluateFlag(KEY, state, { userId: "u1", role: "admin" })).toBe(true);
    expect(evaluateFlag(KEY, state, { userId: "u-blocked", role: "admin" })).toBe(false);
    expect(evaluateFlag(KEY, state, { userId: "u2", role: "user" })).toBe(false);
  });

  it("a 30% rollout reaches about 30% of 10,000 users, the same ones every time", () => {
    const state = { enabled: false, rules: [{ type: "percentage" as const, percent: 30 }] };
    const ids = Array.from({ length: 10_000 }, (_, i) => `user-${i}`);
    const on = ids.filter((userId) => evaluateFlag(KEY, state, { userId }));
    expect(on.length / ids.length).toBeGreaterThan(0.28);
    expect(on.length / ids.length).toBeLessThan(0.32);
    expect(ids.filter((userId) => evaluateFlag(KEY, state, { userId }))).toEqual(on);
    expect(bucket(KEY, "user-1")).toBe(bucket(KEY, "user-1"));
    expect(bucket("other.flag", "user-1")).not.toBe(bucket(KEY, "user-1"));
  });

  it("anonymous visitors bucket by their cookie id; without one the rollout skips them", () => {
    const state = { enabled: false, rules: [{ type: "percentage" as const, percent: 100 }] };
    expect(evaluateFlag(KEY, state, { anonymousId: "anon-1" })).toBe(true);
    expect(evaluateFlag(KEY, state, {})).toBe(false);
  });

  // scaffold:begin multi_tenancy
  it("organization rules match the active organization", () => {
    const state = { enabled: false, rules: [{ type: "organization" as const, organizationIds: ["org1"], value: true }] };
    expect(evaluateFlag(KEY, state, { userId: "u1", organizationId: "org1" })).toBe(true);
    expect(evaluateFlag(KEY, state, { userId: "u1", organizationId: "org2" })).toBe(false);
  });
  // scaffold:end multi_tenancy
});

describe("evaluation", () => {
  it("a flag nobody saved has its code default", async () => {
    expect(await isEnabled(KEY, { userId: "u1" })).toBe(FLAGS[KEY].default);
  });

  it("a saved change applies on the next read and is kept in history", async () => {
    await updateFlag(KEY, { enabled: true }, "admin1");
    expect(await isEnabled(KEY, { userId: "u1" })).toBe(true);
    await updateFlag(KEY, { enabled: false }, "admin1");
    expect(await isEnabled(KEY, { userId: "u1" })).toBe(false);
    expect(store.changes.map((change) => change.after.enabled)).toEqual([true, false]);
  });

  it("ignores stored rules that no longer parse", async () => {
    store.flags.set(KEY, { key: KEY, enabled: true, rules: [{ type: "plan", plans: ["pro"] }] });
    await updateFlag(KEY, { enabled: true }, "admin1"); // clears the cache, keeps the bad rules out
    expect(await isEnabled(KEY, {})).toBe(true);
  });
});

describe("server enforcement", () => {
  const router = createTRPCRouter({ beta: flagProcedure(KEY).query(() => "secret") });

  it("a flagged procedure is FORBIDDEN while the flag is off, even when called directly", async () => {
    await updateFlag(KEY, { enabled: false }, "admin1");
    await expect(router.createCaller(ctxFor("user") as never).beta()).rejects.toMatchObject({ code: "FORBIDDEN" });
    await updateFlag(KEY, { enabled: false, rules: [{ type: "user", userIds: ["u1"], value: true }] }, "admin1");
    expect(await router.createCaller(ctxFor("user") as never).beta()).toBe("secret");
  });

  it("requireFlag answers 404 for route handlers while off", async () => {
    await updateFlag(KEY, { enabled: false }, "admin1");
    const response = await requireFlag(KEY, new Request("http://localhost/api/x"));
    expect(response?.status).toBe(404);
    await updateFlag(KEY, { enabled: true }, "admin1");
    expect(await requireFlag(KEY, new Request("http://localhost/api/x"))).toBeNull();
  });
});

describe("flags router", () => {
  it("admins change flags; the demo guest can look but not change; users cannot look", async () => {
    const admin = flagsRouter.createCaller(ctxFor("admin", "admin1") as never);
    await admin.update({ key: KEY, enabled: true, rules: [{ type: "role", roles: ["guest"], value: false }] });
    expect((await admin.list()).find((flag) => flag.key === KEY)).toMatchObject({ stored: true, enabled: true });
    expect(await admin.history({ key: KEY })).toEqual([expect.objectContaining({ actorEmail: "admin@example.com" })]);

    const guest = flagsRouter.createCaller(ctxFor("guest") as never);
    expect(await guest.list()).not.toHaveLength(0);
    await expect(guest.update({ key: KEY, enabled: false })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(flagsRouter.createCaller(ctxFor("user") as never).list()).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(admin.update({ key: "nope" as never, enabled: true })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("previews every flag as a given user, and the caller's own flags", async () => {
    const admin = flagsRouter.createCaller(ctxFor("admin", "admin1") as never);
    await admin.update({ key: KEY, enabled: false, rules: [{ type: "user", userIds: ["u-ada"], value: true }] });
    expect((await admin.preview({ user: "ada@example.com" })).flags[KEY]).toBe(true);
    expect((await admin.forSession())[KEY]).toBe(false);
    await expect(admin.preview({ user: "ghost@example.com" })).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});
