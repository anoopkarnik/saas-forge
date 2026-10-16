import { McpServer, type CallToolResult } from "@modelcontextprotocol/server";
import { logger } from "@workspace/observability/winston-logger";
import { appMcpTools } from "@/lib/mcp/catalog";
import { McpToolError, type McpCaller, type McpTool } from "@/lib/mcp/define";
import { platformMcpInstructions, platformMcpTools } from "@/lib/mcp/platform";
import { getSiteConfig } from "@/lib/site-config/service";

const instructions = (appName: string) =>
  [
    `These tools read the signed-in user's ${appName} account through their API key: profile, credits and whatever the app's modules add. A tool fails with a message naming the scope it needs when the key lacks it.`,
    platformMcpInstructions,
  ]
    .filter(Boolean)
    .join("\n\n");

function text(value: unknown, isError = false): CallToolResult {
  return {
    content: [{ type: "text", text: typeof value === "string" ? value : JSON.stringify(value, null, 2) }],
    ...(isError ? { isError: true } : {}),
  };
}

/** Every tool the server offers: the app's, then the platform slot's. */
export function listMcpTools(): McpTool[] {
  return [...appMcpTools, ...platformMcpTools];
}

/** Runs one tool for one caller: scope check, input check, then the tool, with errors the agent can read. */
export async function callMcpTool(tool: McpTool, input: unknown, caller: McpCaller): Promise<CallToolResult> {
  if (!caller.scopes.includes(tool.scope)) {
    return text(
      `This API key is missing the ${tool.scope} scope that ${tool.name} needs. Create a key with it in Settings → API keys.`,
      true,
    );
  }
  // The SDK validates too; parsing here keeps every caller to the schema.
  const parsed = tool.input.safeParse(input ?? {});
  if (!parsed.success) return text(`Invalid input for ${tool.name}: ${parsed.error.message}`, true);
  const started = Date.now();
  try {
    const result = await tool.run(parsed.data, caller);
    logger.info(`mcp.tool_called ${JSON.stringify({ tool: tool.name, userId: caller.userId, ms: Date.now() - started })}`);
    return text(result);
  } catch (err) {
    if (err instanceof McpToolError) return text(err.message, true);
    // Never hand database or network details to the model.
    logger.error(`mcp.tool_failed ${JSON.stringify({ tool: tool.name, userId: caller.userId, err: String(err) })}`);
    return text(`${tool.name} failed on the server. Try again later.`, true);
  }
}

/** A fresh server per request (stateless serving), with every tool bound to the caller. */
export async function createAppMcpServer(caller: McpCaller): Promise<McpServer> {
  const appName = (await getSiteConfig())["branding.saasName"];
  const server = new McpServer({ name: appName, version: "1.0.0" }, { instructions: instructions(appName) });
  for (const tool of listMcpTools()) {
    server.registerTool(
      tool.name,
      {
        title: tool.title,
        description: tool.description,
        inputSchema: tool.input,
        annotations: { readOnlyHint: tool.readOnly, destructiveHint: false, openWorldHint: false },
      },
      (input) => callMcpTool(tool, input, caller),
    );
  }
  return server;
}
