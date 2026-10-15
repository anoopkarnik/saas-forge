// @vitest-environment node
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { openAgentStream } = vi.hoisted(() => ({ openAgentStream: vi.fn() }));
vi.mock("@/server/routeGuard", () => ({
  guardRoute: vi.fn(async () => ({
    ok: true,
    session: { user: { id: "owner", role: "user" } },
  })),
}));
vi.mock("@/lib/backend/client", () => ({ openAgentStream }));

import { POST } from "@/app/api/ai/agents/[agentId]/stream/route";

beforeEach(() => vi.clearAllMocks());

describe("Launchpad agent cannot bypass project checks through generic streaming", () => {
  it("rejects launchpad_v1 before opening a backend stream", async () => {
    const request = new NextRequest(
      "http://test/api/ai/agents/launchpad_v1/stream",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: "other-owner-project" }),
      },
    );
    const response = await POST(request, {
      params: Promise.resolve({ agentId: "launchpad_v1" }),
    });
    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({
      error: "Use the project's Launchpad to request guidance.",
    });
    expect(openAgentStream).not.toHaveBeenCalled();
    expect(request.bodyUsed).toBe(false);
  });
});
