import { describe, expect, it, vi } from "vitest";
import { McpConfigError, connectMcpTools, mcpToolName, parseMcpServers } from "../mcp";

describe("parseMcpServers", () => {
  it("reads the shared JSON shape", () => {
    expect(
      parseMcpServers('[{"name":"docs","url":"https://mcp.example.com/mcp","headers":{"Authorization":"Bearer t"}}]'),
    ).toEqual([{ name: "docs", url: "https://mcp.example.com/mcp", headers: { Authorization: "Bearer t" } }]);
  });

  it("treats an unset or blank value as no servers", () => {
    expect(parseMcpServers(undefined)).toEqual([]);
    expect(parseMcpServers("  ")).toEqual([]);
  });

  it.each([
    ["not json", "JSON array"],
    ['{"name":"docs"}', "invalid"],
    ['[{"name":"Docs!","url":"https://mcp.example.com"}]', "lowercase"],
    ['[{"name":"docs","url":"ftp://mcp.example.com"}]', "invalid"],
    ['[{"name":"a","url":"https://a.example.com"},{"name":"a","url":"https://b.example.com"}]', "duplicate"],
  ])("rejects %s", (raw, message) => {
    expect(() => parseMcpServers(raw)).toThrow(McpConfigError);
    expect(() => parseMcpServers(raw)).toThrow(message);
  });
});

describe("mcpToolName", () => {
  it("prefixes the server and keeps provider-safe characters", () => {
    expect(mcpToolName("docs", "search.pages")).toBe("docs_search_pages");
    expect(mcpToolName("docs", "x".repeat(80))).toHaveLength(64);
  });
});

function fakeClient(tools: Record<string, unknown>) {
  return { tools: vi.fn(async () => tools), close: vi.fn(async () => {}) };
}

describe("connectMcpTools", () => {
  it("merges tools under prefixed names and skips a server that fails", async () => {
    const docs = fakeClient({ search: { description: "Search" } });
    const onServerError = vi.fn();
    const createClient = vi.fn(async ({ transport }: any) => {
      expect(transport.redirect).toBe("error");
      if (transport.url.includes("down")) throw new Error("refused");
      return docs;
    });

    const connection = await connectMcpTools(
      [
        { name: "docs", url: "https://docs.example.com/mcp" },
        { name: "down", url: "https://down.example.com/mcp" },
      ],
      { createClient: createClient as any, onServerError },
    );

    expect(Object.keys(connection.tools)).toEqual(["docs_search"]);
    expect(connection.servers).toEqual(["docs"]);
    expect(onServerError).toHaveBeenCalledWith("down", expect.any(Error));

    await connection.close();
    await connection.close();
    expect(docs.close).toHaveBeenCalledTimes(1);
  });

  it("gives up on a slow server and still closes it once it connects", async () => {
    vi.useFakeTimers();
    const slow = fakeClient({ search: {} });
    let resolve!: (client: typeof slow) => void;
    const createClient = vi.fn(() => new Promise<typeof slow>((done) => (resolve = done)));
    const onServerError = vi.fn();

    const pending = connectMcpTools([{ name: "slow", url: "https://slow.example.com/mcp" }], {
      createClient: createClient as any,
      onServerError,
      timeoutMs: 100,
    });
    await vi.advanceTimersByTimeAsync(150);
    const connection = await pending;
    expect(connection.servers).toEqual([]);
    expect(onServerError).toHaveBeenCalledWith("slow", expect.objectContaining({ message: "timed out after 100ms" }));

    resolve(slow);
    await vi.advanceTimersByTimeAsync(0);
    await connection.close();
    expect(slow.close).toHaveBeenCalled();
    vi.useRealTimers();
  });
});
