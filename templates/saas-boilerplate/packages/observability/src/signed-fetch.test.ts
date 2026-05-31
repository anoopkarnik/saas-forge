import { describe, expect, it, vi, beforeEach } from "vitest";
import { canonicalBody, signedFetch } from "./signed-fetch";

describe("canonicalBody", () => {
  it("is deterministic regardless of key order", () => {
    expect(canonicalBody({ b: 2, a: 1 })).toBe('{"a":1,"b":2}');
    expect(canonicalBody({ a: 1, b: 2 })).toBe('{"a":1,"b":2}');
  });
});

describe("signedFetch", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("attaches X-Saas-Forge-Ts and X-Saas-Forge-Sig headers", async () => {
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({ ok: true }), { status: 200 }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await signedFetch({
      url: "http://backend/agents/stream",
      secret: "test-secret",
      payload: { user_id: "u1" },
    });

    expect(fetchMock).toHaveBeenCalledOnce();
    const call = fetchMock.mock.calls[0]!;
    const init = call[1] as RequestInit;
    const headers = new Headers(init.headers);
    expect(headers.get("X-Saas-Forge-Ts")).toMatch(/^\d+$/);
    expect(headers.get("X-Saas-Forge-Sig")).toMatch(/^[0-9a-f]{64}$/);
    expect(headers.get("X-Saas-Forge-Req-Id")).toBeTruthy();
    expect(headers.get("Content-Type")).toBe("application/json");
    expect(init.body).toBe('{"user_id":"u1"}');
  });
});
