import { createMCPClient, type MCPClient } from "@ai-sdk/mcp";
import type { ToolSet } from "ai";
import { z } from "zod";

/**
 * Remote MCP servers whose tools the AI chat may call. The deployer lists them
 * in AI_MCP_SERVERS (server-only env, shared with the Python backend's
 * mcp_tools agent): a JSON array of { name, url, headers? }. Every user's chat
 * reaches the same servers with the same headers, so only configure servers
 * whose data every signed-in user may see.
 */

export const mcpServerSchema = z.object({
  name: z.string().regex(/^[a-z0-9_]{1,32}$/, "use 1-32 lowercase letters, digits or _"),
  url: z.url({ protocol: /^https?$/ }),
  headers: z.record(z.string(), z.string()).optional(),
});

export type McpServerConfig = z.infer<typeof mcpServerSchema>;

export class McpConfigError extends Error {}

export function parseMcpServers(raw: string | undefined = process.env.AI_MCP_SERVERS): McpServerConfig[] {
  if (!raw?.trim()) return [];
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    throw new McpConfigError("AI_MCP_SERVERS must be a JSON array of { name, url, headers? }.");
  }
  const parsed = z.array(mcpServerSchema).safeParse(json);
  if (!parsed.success) {
    const detail = parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; ");
    throw new McpConfigError(`AI_MCP_SERVERS is invalid: ${detail}`);
  }
  const names = parsed.data.map((server) => server.name);
  if (new Set(names).size !== names.length) throw new McpConfigError("AI_MCP_SERVERS has duplicate server names.");
  return parsed.data;
}

/** `<server>_<tool>`, limited to what model providers accept in a tool name. */
export function mcpToolName(server: string, tool: string): string {
  return `${server}_${tool}`.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 64);
}

export type McpToolsConnection = {
  tools: ToolSet;
  /** Servers that connected and listed their tools. */
  servers: string[];
  /** Closes every client; safe to call more than once. */
  close: () => Promise<void>;
};

const timeout = (ms: number) =>
  new Promise<never>((_, reject) => setTimeout(() => reject(new Error(`timed out after ${ms}ms`)), ms));

/** Connects to every server in parallel; one that fails or is slow is reported and skipped. */
export async function connectMcpTools(
  servers: McpServerConfig[],
  {
    timeoutMs = 5000,
    onServerError,
    createClient = createMCPClient,
  }: {
    timeoutMs?: number;
    onServerError?: (server: string, error: unknown) => void;
    createClient?: typeof createMCPClient;
  } = {},
): Promise<McpToolsConnection> {
  const clients: MCPClient[] = [];
  const tools: ToolSet = {};
  const connected: string[] = [];

  await Promise.all(
    servers.map(async (server) => {
      const connecting = createClient({
        // Redirects could send the configured headers to another host.
        transport: { type: "http", url: server.url, headers: server.headers, redirect: "error" },
      });
      // A client that connects after the timeout is still closed.
      connecting.then((client) => clients.push(client)).catch(() => {});
      try {
        const client = await Promise.race([connecting, timeout(timeoutMs)]);
        const serverTools = await Promise.race([client.tools(), timeout(timeoutMs)]);
        for (const [name, tool] of Object.entries(serverTools)) tools[mcpToolName(server.name, name)] = tool;
        connected.push(server.name);
      } catch (error) {
        onServerError?.(server.name, error);
      }
    }),
  );

  let closed = false;
  return {
    tools,
    servers: connected,
    close: async () => {
      if (closed) return;
      closed = true;
      await Promise.allSettled(clients.map((client) => client.close()));
    },
  };
}
