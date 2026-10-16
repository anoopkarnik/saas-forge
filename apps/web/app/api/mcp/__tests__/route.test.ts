import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

const { mockAuth, mockListProjects } = vi.hoisted(() => ({
  mockAuth: vi.fn(),
  mockListProjects: vi.fn(),
}));

vi.mock("@/server/authenticateApiKey", () => ({ authenticateApiKey: mockAuth }));
vi.mock("@workspace/database/client", () => ({
  default: { projectConfig: { findMany: mockListProjects } },
}));

import { POST } from "../route";

function rpc(method: string, params: Record<string, unknown> = {}, id = 1) {
  return new NextRequest("http://localhost/api/mcp", {
    method: "POST",
    headers: {
      authorization: "Bearer sk_test",
      "content-type": "application/json",
      accept: "application/json, text/event-stream",
    },
    body: JSON.stringify({ jsonrpc: "2.0", id, method, params }),
  });
}

/** Reads a JSON-RPC response sent either as JSON or as one SSE message. */
async function readRpc(res: Response) {
  const body = await res.text();
  if (!(res.headers.get("content-type") ?? "").includes("text/event-stream")) return JSON.parse(body);
  const data = body.split("\n").find((line) => line.startsWith("data: "));
  return JSON.parse(data!.slice("data: ".length));
}

const initialize = {
  protocolVersion: "2025-06-18",
  capabilities: {},
  clientInfo: { name: "test", version: "1.0.0" },
};

beforeEach(() => {
  vi.clearAllMocks();
  mockAuth.mockResolvedValue({ ok: true, userId: "u1", keyId: "k1", scopes: ["read:projects"] });
});

describe("/api/mcp", () => {
  it("returns the API-key error before any MCP handling", async () => {
    mockAuth.mockResolvedValueOnce({
      ok: false,
      response: NextResponse.json({ error: { code: "invalid_api_key" } }, { status: 401 }),
    });
    const res = await POST(rpc("initialize", initialize));
    expect(res.status).toBe(401);
    expect(mockAuth).toHaveBeenCalledWith(expect.anything(), { scopes: [] });
  });

  it("initializes as the saas-forge server with instructions", async () => {
    const message = await readRpc(await POST(rpc("initialize", initialize)));
    expect(message.result.serverInfo.name).toBe("saas-forge");
    expect(message.result.instructions).toContain("quote_upgrade");
  });

  it("lists the tools with read-only hints", async () => {
    const message = await readRpc(await POST(rpc("tools/list")));
    const tools = message.result.tools as Array<{ name: string; annotations: { readOnlyHint: boolean } }>;
    expect(tools.map((tool) => tool.name)).toContain("quote_upgrade");
    expect(tools.find((tool) => tool.name === "list_projects")!.annotations.readOnlyHint).toBe(true);
    expect(tools.find((tool) => tool.name === "create_project")!.annotations.readOnlyHint).toBe(false);
  });

  it("runs a tool as the key's user", async () => {
    mockListProjects.mockResolvedValueOnce([{ slug: "acme" }]);
    const message = await readRpc(await POST(rpc("tools/call", { name: "list_projects", arguments: {} })));
    expect(JSON.parse(message.result.content[0].text)).toEqual({ projects: [{ slug: "acme" }] });
    expect(mockListProjects).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: "u1" } }));
  });

  it("answers a missing scope as a tool error", async () => {
    const message = await readRpc(await POST(rpc("tools/call", { name: "get_credits", arguments: {} })));
    expect(message.result.isError).toBe(true);
    expect(message.result.content[0].text).toContain("read:credits");
  });
});
