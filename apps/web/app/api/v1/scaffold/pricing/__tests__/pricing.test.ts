import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextResponse } from "next/server";

const mockAuth = vi.fn();
vi.mock("@/server/authenticateApiKey", () => ({
  authenticateApiKey: (...args: any[]) => mockAuth(...args),
}));

import { GET } from "../route";

const req = {} as any;

describe("GET /api/v1/scaffold/pricing", () => {
  beforeEach(() => vi.clearAllMocks());

  it("blocks unauthenticated callers", async () => {
    mockAuth.mockResolvedValue({
      ok: false,
      response: NextResponse.json({ error: {} }, { status: 401 }),
    });
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it("returns registry pricing with implemented-aware costs", async () => {
    mockAuth.mockResolvedValue({ ok: true, userId: "u1" });
    const res = await GET(req);
    const body = await res.json();

    expect(body.baseCredits).toBe(20);
    expect(body.tierUpgradeCreditsPerStep).toBe(3);

    const billing = body.modules.find((m: any) => m.id === "billing");
    expect(billing.creditsCost).toBe(10);
    expect(billing.implemented).toBe(true);
    expect(billing.available).toBe(true);
    const agents = body.modules.find((m: any) => m.id === "ai_agents");
    expect(agents.requires).toEqual(["ai"]);

    const multi = body.modules.find((m: any) => m.id === "multi_tenancy");
    expect(multi.downloadEnabled).toBe(true);
    expect(multi.creditsCost).toBe(50);
    expect(multi.implemented).toBe(true);

    // Not-yet-implemented module is listed but charged 0.
    const notifications = body.modules.find((m: any) => m.id === "notifications");
    expect(notifications.creditsCost).toBe(0);
    expect(notifications.listedCreditsCost).toBe(5);
    expect(notifications.implemented).toBe(false);
  });
});
