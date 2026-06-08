import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@workspace/auth/better-auth/auth", () => ({
  auth: { api: { getSession: vi.fn(async () => null) } },
}));

const { createdRows, stored, apiKey } = vi.hoisted(() => {
  const createdRows: any[] = [];
  const stored = new Map<string, any>();

  const apiKey = {
    create: vi.fn(async ({ data, select }: any) => {
      const row = {
        id: `k${stored.size + 1}`,
        ...data,
        lastUsedAt: null,
        revokedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      stored.set(row.id, row);
      createdRows.push(row);
      const out: any = {};
      for (const k of Object.keys(select ?? row)) out[k] = (row as any)[k];
      return select ? out : row;
    }),
    findMany: vi.fn(async ({ where }: any) =>
      [...stored.values()].filter((r) => r.userId === where.userId).map((r) => ({
        id: r.id,
        label: r.label,
        keyPrefix: r.keyPrefix,
        scopes: r.scopes,
        status: r.status,
        lastUsedAt: r.lastUsedAt,
        expiresAt: r.expiresAt,
        createdAt: r.createdAt,
      })),
    ),
    findFirst: vi.fn(async ({ where }: any) => {
      for (const r of stored.values()) {
        if (r.id === where.id && r.userId === where.userId) return r;
      }
      return null;
    }),
    update: vi.fn(async ({ where, data }: any) => {
      const row = stored.get(where.id);
      if (!row) return null;
      Object.assign(row, data);
      return row;
    }),
  };

  return { createdRows, stored, apiKey };
});

vi.mock("@workspace/database/client", () => {
  const client: any = { apiKey };
  client.$extends = () => client;
  return { default: client };
});

vi.mock("@workspace/observability/winston-logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import { apiKeyRouter } from "../apiKeyProcedures";

const ctx = {
  headers: new Headers(),
  session: { user: { id: "u1", role: "user", email: "u1@example.com", name: "u" } },
} as any;

describe("apiKey router", () => {
  beforeEach(() => {
    stored.clear();
    createdRows.length = 0;
    vi.clearAllMocks();
  });

  it("create returns plaintext exactly once and persists hash only", async () => {
    const caller = apiKeyRouter.createCaller(ctx);
    const res = await caller.create({ label: "CI", scopes: ["read:me"] });

    expect(res.plaintext).toMatch(/^sk_[A-Za-z0-9]{10}_[A-Za-z0-9]{32}$/);
    expect(res.key.keyPrefix).toBe(res.plaintext.slice(0, 13));
    expect((res.key as any).keyHash).toBeUndefined();

    // DB row has hash, not plaintext
    expect(createdRows.length).toBe(1);
    expect(createdRows[0].keyHash).toMatch(/^[a-f0-9]{64}$/);
    expect(JSON.stringify(createdRows[0])).not.toContain(res.plaintext.slice(14));
  });

  it("create rejects unknown scope", async () => {
    const caller = apiKeyRouter.createCaller(ctx);
    await expect(
      caller.create({ label: "x", scopes: ["write:everything" as any] }),
    ).rejects.toThrow();
  });

  it("list returns only this user's keys without keyHash", async () => {
    const caller = apiKeyRouter.createCaller(ctx);
    await caller.create({ label: "k1", scopes: ["read:me"] });
    // Inject a foreign key directly into the store
    stored.set("foreign", {
      id: "foreign",
      userId: "other",
      label: "x",
      keyPrefix: "sk_zzzzzzzzzz",
      keyHash: "z",
      scopes: ["read:me"],
      status: "active",
      lastUsedAt: null,
      expiresAt: null,
      revokedAt: null,
      createdAt: new Date(),
    });

    const rows = await caller.list();
    expect(rows).toHaveLength(1);
    expect((rows[0] as any).keyHash).toBeUndefined();
  });

  it("revoke 404s on a key owned by another user", async () => {
    stored.set("foreign", {
      id: "foreign",
      userId: "other",
      label: "x",
      keyPrefix: "sk_zzzzzzzzzz",
      keyHash: "z",
      scopes: ["read:me"],
      status: "active",
    });
    const caller = apiKeyRouter.createCaller(ctx);
    await expect(caller.revoke({ id: "foreign" })).rejects.toThrow();
  });

  it("revoke marks the user's key as revoked", async () => {
    const caller = apiKeyRouter.createCaller(ctx);
    const createRes = await caller.create({ label: "k1", scopes: ["read:me"] });
    const res = await caller.revoke({ id: createRes.key.id });
    expect(res.id).toBe(createRes.key.id);
    expect(stored.get(createRes.key.id)!.status).toBe("revoked");
    expect(stored.get(createRes.key.id)!.revokedAt).toBeInstanceOf(Date);
  });
});
