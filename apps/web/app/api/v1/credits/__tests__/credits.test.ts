import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextResponse } from "next/server";

const mockAuth = vi.fn();
vi.mock("@/server/authenticateApiKey", () => ({
  authenticateApiKey: (...args: any[]) => mockAuth(...args),
}));

const mockFindUnique = vi.fn();
vi.mock("@workspace/database/client", () => ({
  default: { user: { findUnique: (...a: any[]) => mockFindUnique(...a) } },
}));

import { GET } from "../route";

const req = {} as any;

describe("GET /api/v1/credits", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns the auth failure response when the key is invalid", async () => {
    mockAuth.mockResolvedValue({
      ok: false,
      response: NextResponse.json({ error: { code: "invalid_api_key" } }, { status: 401 }),
    });
    const res = await GET(req);
    expect(res.status).toBe(401);
    expect(mockFindUnique).not.toHaveBeenCalled();
  });

  it("requires the read:credits scope", async () => {
    mockAuth.mockResolvedValue({ ok: true, userId: "u1" });
    mockFindUnique.mockResolvedValue({ creditsTotal: 100, creditsUsed: 30 });
    await GET(req);
    expect(mockAuth).toHaveBeenCalledWith(req, { scopes: ["read:credits"] });
  });

  it("returns the credit balance", async () => {
    mockAuth.mockResolvedValue({ ok: true, userId: "u1" });
    mockFindUnique.mockResolvedValue({ creditsTotal: 100, creditsUsed: 30 });
    const res = await GET(req);
    const body = await res.json();
    expect(body.credits).toEqual({ total: 100, used: 30, remaining: 70 });
  });

  it("404s when the user no longer exists", async () => {
    mockAuth.mockResolvedValue({ ok: true, userId: "gone" });
    mockFindUnique.mockResolvedValue(null);
    const res = await GET(req);
    expect(res.status).toBe(404);
  });
});
