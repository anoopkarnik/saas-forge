import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@workspace/auth/better-auth/auth", () => ({
  auth: {
    api: {
      getSession: vi.fn(),
    },
  },
}));

vi.mock("@/lib/backend/client", () => ({
  openAgentStream: vi.fn(),
}));

import { POST } from "@/app/api/ai/agents/[agentId]/stream/route";
import { auth } from "@workspace/auth/better-auth/auth";
import { openAgentStream } from "@/lib/backend/client";

const params = Promise.resolve({ agentId: "noop" });

function makeReq(body: unknown): Request {
  return new Request("http://test/api/ai/agents/noop/stream", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }) as unknown as Request;
}

describe("agents stream proxy", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when no session", async () => {
    (auth.api.getSession as any).mockResolvedValueOnce(null);
    const resp = await POST(makeReq({}) as any, { params } as any);
    expect(resp.status).toBe(401);
  });

  it("pipes upstream body through when session present and backend OK", async () => {
    (auth.api.getSession as any).mockResolvedValueOnce({ user: { id: "u1" } });
    const upstreamBody = "event: end\ndata: {}\n\n";
    (openAgentStream as any).mockResolvedValueOnce(
      new Response(upstreamBody, { status: 200 }),
    );
    const resp = await POST(makeReq({ q: "hi" }) as any, { params } as any);
    expect(resp.status).toBe(200);
    expect(resp.headers.get("Content-Type")).toBe("text/event-stream");
    expect(await resp.text()).toBe(upstreamBody);
  });

  it("returns 502 if backend errors", async () => {
    (auth.api.getSession as any).mockResolvedValueOnce({ user: { id: "u1" } });
    (openAgentStream as any).mockResolvedValueOnce(new Response("oops", { status: 500 }));
    const resp = await POST(makeReq({}) as any, { params } as any);
    expect(resp.status).toBe(502);
  });
});
