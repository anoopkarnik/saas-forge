import { beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

// The SDK owns transport; capture only the server configuration boundary.
const { constructed, registrations } = vi.hoisted(() => ({
  constructed: [] as unknown[][],
  registrations: new Map<
    string,
    { config: unknown; run: (input: unknown) => Promise<unknown> }
  >(),
}));
vi.mock("@modelcontextprotocol/server", () => ({
  McpServer: class {
    constructor(...options: unknown[]) {
      constructed.push(options);
    }
    registerTool(
      name: string,
      config: unknown,
      run: (input: unknown) => Promise<unknown>,
    ) {
      registrations.set(name, { config, run });
    }
  },
}));
vi.mock("@workspace/observability/winston-logger", () => ({
  logger: { info: vi.fn(), error: vi.fn() },
}));

import { defineMcpTool, McpToolError } from "./define";
import { callMcpTool, createMcpServer } from "./server";

const caller = { userId: "user-7", scopes: ["read:me"] };
const tool = defineMcpTool({
  name: "read_selected",
  title: "Read selected item",
  description: "Read a caller-owned item.",
  scope: "read:me",
  readOnly: true,
  input: z.object({ limit: z.number().int().positive().default(3) }).strict(),
  run: async ({ limit }, { userId }) => ({ userId, limit }),
});
const resultText = (result: Awaited<ReturnType<typeof callMcpTool>>) =>
  (result.content[0] as { text: string }).text;

beforeEach(() => {
  constructed.length = 0;
  registrations.clear();
});

describe("injected MCP server configuration", () => {
  it("uses the caller's supplied tool list, branding and platform instructions", async () => {
    createMcpServer(caller, {
      appName: "Acme",
      tools: [tool],
      platformInstructions: "Only Acme project data is available.",
    });

    expect(constructed).toEqual([
      [
        { name: "Acme", version: "1.0.0" },
        { instructions: expect.stringContaining("Acme account") },
      ],
    ]);
    expect(
      (constructed[0]?.[1] as { instructions: string }).instructions,
    ).toContain("Only Acme project data is available.");
    expect([...registrations.keys()]).toEqual(["read_selected"]);
    expect(registrations.get("read_selected")?.config).toMatchObject({
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        openWorldHint: false,
      },
    });
    const result = (await registrations
      .get("read_selected")!
      .run({})) as Awaited<ReturnType<typeof callMcpTool>>;
    expect(JSON.parse(resultText(result))).toEqual({
      userId: "user-7",
      limit: 3,
    });
  });

  it("does not register app catalog tools when the supplied tool list is empty", () => {
    createMcpServer(caller, { appName: "Empty app", tools: [] });
    expect([...registrations.keys()]).toEqual([]);
  });
});

describe("package tool execution isolation", () => {
  it("rejects a missing scope before parsing or running a tool", async () => {
    const result = await callMcpTool(
      tool,
      { limit: -1 },
      { userId: "user-7", scopes: [] },
    );
    expect(result.isError).toBe(true);
    expect(resultText(result)).toContain("read:me");
    expect(resultText(result)).not.toContain("Invalid input");
  });

  it("rejects input outside the supplied tool's schema", async () => {
    const result = await callMcpTool(tool, { limit: -1 }, caller);
    expect(result.isError).toBe(true);
    expect(resultText(result)).toContain("Invalid input for read_selected");
  });

  it("passes actionable tool errors through while hiding unexpected server details", async () => {
    const actionable = await callMcpTool(
      {
        ...tool,
        run: async () => {
          throw new McpToolError("Choose an existing item.");
        },
      },
      {},
      caller,
    );
    expect(actionable.isError).toBe(true);
    expect(resultText(actionable)).toBe("Choose an existing item.");

    const unexpected = await callMcpTool(
      {
        ...tool,
        run: async () => {
          throw new Error("postgres://secret@10.0.0.5/private");
        },
      },
      {},
      caller,
    );
    expect(unexpected.isError).toBe(true);
    expect(resultText(unexpected)).toBe(
      "read_selected failed on the server. Try again later.",
    );
    expect(resultText(unexpected)).not.toContain("secret");
  });
});
