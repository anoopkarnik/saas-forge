import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock Prisma client surface for ApiKey
const apiKey = vi.hoisted(() => ({
  findUnique: vi.fn(),
  update: vi.fn(async () => ({})),
}));

vi.mock("@workspace/database/client", () => {
  const client: any = { apiKey };
  client.$extends = () => client;
  return { default: client };
});

// Mock Upstash rate limiter — default allow, individual tests override
const limitMock = vi.hoisted(() =>
  vi.fn(async () => ({ success: true, reset: Date.now() + 60_000 }))
);
vi.mock("../apiKeyRateLimit", () => ({
  apiKeyRateLimit: { limit: limitMock },
}));

// Mock winston logger to silence
vi.mock("@workspace/observability/winston-logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import { NextRequest } from "next/server";
import { hashApiKey } from "@workspace/auth/api-keys";
import { authenticateApiKey } from "../authenticateApiKey";

function reqWith(authHeader?: string): NextRequest {
  const headers = new Headers();
  if (authHeader) headers.set("authorization", authHeader);
  return new NextRequest("http://localhost/api/v1/me", { headers });
}

const validPlaintext = "sk_aaaaaaaaaa_bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";
const validPrefix = "sk_aaaaaaaaaa";
const validHash = hashApiKey(validPlaintext);

const activeRow = {
  id: "k1",
  userId: "u1",
  keyHash: validHash,
  scopes: ["read:me"],
  status: "active",
  expiresAt: null,
};

describe("authenticateApiKey", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    limitMock.mockResolvedValue({ success: true, reset: Date.now() + 60_000 });
  });

  it("returns 401 missing_authorization when header absent", async () => {
    const r = await authenticateApiKey(reqWith(), { scopes: ["read:me"] });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.response.status).toBe(401);
    expect(await r.response.json()).toEqual({
      error: { code: "missing_authorization", message: expect.any(String) },
    });
  });

  it("returns 401 invalid_authorization_format when header malformed", async () => {
    const r = await authenticateApiKey(reqWith("garbage"), { scopes: ["read:me"] });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.response.status).toBe(401);
    expect((await r.response.json()).error.code).toBe("invalid_authorization_format");
  });

  it("returns 401 invalid_api_key when prefix not found", async () => {
    apiKey.findUnique.mockResolvedValueOnce(null);
    const r = await authenticateApiKey(reqWith(`Bearer ${validPlaintext}`), {
      scopes: ["read:me"],
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect((await r.response.json()).error.code).toBe("invalid_api_key");
  });

  it("returns 401 invalid_api_key when hash mismatches (no oracle)", async () => {
    apiKey.findUnique.mockResolvedValueOnce({
      ...activeRow,
      keyHash: hashApiKey("sk_aaaaaaaaaa_DIFFERENT"),
    });
    const r = await authenticateApiKey(reqWith(`Bearer ${validPlaintext}`), {
      scopes: ["read:me"],
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect((await r.response.json()).error.code).toBe("invalid_api_key");
  });

  it("returns 401 api_key_revoked", async () => {
    apiKey.findUnique.mockResolvedValueOnce({ ...activeRow, status: "revoked" });
    const r = await authenticateApiKey(reqWith(`Bearer ${validPlaintext}`), {
      scopes: ["read:me"],
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect((await r.response.json()).error.code).toBe("api_key_revoked");
  });

  it("returns 401 api_key_expired", async () => {
    apiKey.findUnique.mockResolvedValueOnce({
      ...activeRow,
      expiresAt: new Date(Date.now() - 1000),
    });
    const r = await authenticateApiKey(reqWith(`Bearer ${validPlaintext}`), {
      scopes: ["read:me"],
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect((await r.response.json()).error.code).toBe("api_key_expired");
  });

  it("returns 403 insufficient_scope when required scope not in key", async () => {
    apiKey.findUnique.mockResolvedValueOnce({ ...activeRow, scopes: [] });
    const r = await authenticateApiKey(reqWith(`Bearer ${validPlaintext}`), {
      scopes: ["read:me"],
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.response.status).toBe(403);
    expect((await r.response.json()).error.code).toBe("insufficient_scope");
  });

  it("returns 429 rate_limited with Retry-After when limit exhausted", async () => {
    apiKey.findUnique.mockResolvedValueOnce(activeRow);
    limitMock.mockResolvedValueOnce({ success: false, reset: Date.now() + 30_000 });
    const r = await authenticateApiKey(reqWith(`Bearer ${validPlaintext}`), {
      scopes: ["read:me"],
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.response.status).toBe(429);
    expect((await r.response.json()).error.code).toBe("rate_limited");
    expect(r.response.headers.get("Retry-After")).not.toBeNull();
  });

  it("returns ok and updates lastUsedAt on success", async () => {
    apiKey.findUnique.mockResolvedValueOnce(activeRow);
    const r = await authenticateApiKey(reqWith(`Bearer ${validPlaintext}`), {
      scopes: ["read:me"],
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.userId).toBe("u1");
    expect(r.keyId).toBe("k1");
    expect(r.scopes).toEqual(["read:me"]);
    // lastUsedAt fire-and-forget — give microtask queue a tick
    await new Promise((resolve) => setImmediate(resolve));
    expect(apiKey.update).toHaveBeenCalledWith({
      where: { id: "k1" },
      data: { lastUsedAt: expect.any(Date) },
    });
  });
});
