import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockUser, mockMembers, mockRecentUsage, mockInbox, mockUnread } = vi.hoisted(() => ({
  mockUser: vi.fn(),
  mockMembers: vi.fn(),
  mockRecentUsage: vi.fn(),
  mockInbox: vi.fn(),
  mockUnread: vi.fn(),
}));

vi.mock("@workspace/database/client", () => ({
  default: { user: { findUnique: mockUser }, member: { findMany: mockMembers } },
}));
vi.mock("@/lib/usage/service", () => ({ recentUsage: mockRecentUsage }));
vi.mock("@/lib/notifications/service", () => ({ listInbox: mockInbox, unreadCount: mockUnread }));

import { appMcpTools } from "@/lib/mcp/catalog";
import { callMcpTool } from "@/lib/mcp/server";

const caller = { userId: "u1", scopes: ["read:me", "read:credits", "read:usage", "read:workspaces", "read:notifications"] };

async function call(name: string, input: unknown = {}, who = caller) {
  const tool = appMcpTools.find((entry) => entry.name === name)!;
  const result = await callMcpTool(tool, input, who);
  const text = (result.content[0] as { text: string }).text;
  return { isError: !!result.isError, text, data: result.isError ? null : JSON.parse(text) };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("callMcpTool", () => {
  it("refuses a tool whose scope the key lacks, naming the scope", async () => {
    const result = await call("get_credits", {}, { userId: "u1", scopes: ["read:me"] });
    expect(result).toMatchObject({ isError: true });
    expect(result.text).toContain("read:credits");
    expect(mockUser).not.toHaveBeenCalled();
  });

  it("hides unexpected server errors from the model", async () => {
    mockUser.mockRejectedValueOnce(new Error("connect ECONNREFUSED 10.0.0.5:5432"));
    const result = await call("get_account");
    expect(result).toEqual({ isError: true, text: "get_account failed on the server. Try again later.", data: null });
  });

  it("rejects input outside the tool's schema", async () => {
    const tool = appMcpTools.find((entry) => entry.name === "get_account")!;
    const limited = { ...tool, input: tool.input.extend({}).strict() };
    const result = await callMcpTool(limited, { extra: true }, caller);
    expect(result.isError).toBe(true);
  });
});

describe("app tools", () => {
  it("reads the caller's account", async () => {
    mockUser.mockResolvedValueOnce({ id: "u1", email: "a@b.co", name: "Ada" });
    const { data } = await call("get_account");
    expect(data).toEqual({ user: { id: "u1", email: "a@b.co", name: "Ada" } });
    expect(mockUser).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "u1" } }));
  });

  it("returns the remaining credits", async () => {
    mockUser.mockResolvedValueOnce({ creditsTotal: 100, creditsUsed: 30 });
    const { data } = await call("get_credits");
    expect(data.credits).toEqual({ total: 100, used: 30, remaining: 70 });
  });

  it("lists recent usage", async () => {
    mockRecentUsage.mockResolvedValueOnce({ items: [{ id: "e1", meter: "ai.chat" }], nextCursor: null });
    const { data } = await call("list_usage", { limit: 5 });
    expect(data.usage).toHaveLength(1);
    expect(mockRecentUsage).toHaveBeenCalledWith("u1", { limit: 5 });
  });

  it("lists workspaces with the caller's role", async () => {
    mockMembers.mockResolvedValueOnce([{ role: "owner", organization: { id: "o1", name: "Acme", slug: "acme" } }]);
    const { data } = await call("list_workspaces");
    expect(data.workspaces).toEqual([{ id: "o1", name: "Acme", slug: "acme", role: "owner" }]);
  });

  it("lists personal notifications with the unread count", async () => {
    mockInbox.mockResolvedValueOnce([{ id: "n1", title: "Paid" }]);
    mockUnread.mockResolvedValueOnce(1);
    const { data } = await call("list_notifications");
    expect(data).toEqual({ unread: 1, notifications: [{ id: "n1", title: "Paid" }] });
    expect(mockInbox).toHaveBeenCalledWith("u1", null, 20);
  });
});
