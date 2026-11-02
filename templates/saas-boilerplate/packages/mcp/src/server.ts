import { McpServer, type CallToolResult } from "@modelcontextprotocol/server";
import { logger } from "@workspace/observability/winston-logger";
import { McpToolError, type McpCaller, type McpTool } from "./define";

const instructions = (appName: string, platformInstructions?: string) =>
  [
    `These tools read the signed-in user's ${appName} account through their API key: profile, credits and whatever the app's modules add. A tool fails with a message naming the scope it needs when the key lacks it.`,
    platformInstructions,
  ]
    .filter(Boolean)
    .join("\n\n");

function text(value: unknown, isError = false): CallToolResult {
  return {
    content: [
      {
        type: "text",
        text:
          typeof value === "string" ? value : JSON.stringify(value, null, 2),
      },
    ],
    ...(isError ? { isError: true } : {}),
  };
}

/** Runs one tool for one caller: scope check, input check, then the tool, with errors the agent can read. */
export async function callMcpTool(
  tool: McpTool,
  input: unknown,
  caller: McpCaller,
): Promise<CallToolResult> {
  if (!caller.scopes.includes(tool.scope)) {
    return text(
      `This API key is missing the ${tool.scope} scope that ${tool.name} needs. Create a key with it in Settings → API keys.`,
      true,
    );
  }
  // The SDK validates too; parsing here keeps every caller to the schema.
  const parsed = tool.input.safeParse(input ?? {});
  if (!parsed.success)
    return text(
      `Invalid input for ${tool.name}: ${parsed.error.message}`,
      true,
    );
  const started = Date.now();
  try {
    const result = await tool.run(parsed.data, caller);
    logger.info(
      `mcp.tool_called ${JSON.stringify({ tool: tool.name, userId: caller.userId, ms: Date.now() - started })}`,
    );
    return text(result);
  } catch (err) {
    if (err instanceof McpToolError) return text(err.message, true);
    // Never hand database or network details to the model.
    logger.error(
      `mcp.tool_failed ${JSON.stringify({ tool: tool.name, userId: caller.userId, err: String(err) })}`,
    );
    return text(`${tool.name} failed on the server. Try again later.`, true);
  }
}

/** A fresh server per request (stateless serving), with every tool bound to the caller. */
export function createMcpServer(
  caller: McpCaller,
  {
    appName,
    tools,
    platformInstructions,
  }: { appName: string; tools: McpTool[]; platformInstructions?: string },
): McpServer {
  const server = new McpServer(
    { name: appName, version: "1.0.0" },
    { instructions: instructions(appName, platformInstructions) },
  );
  for (const tool of tools) {
    server.registerTool(
      tool.name,
      {
        title: tool.title,
        description: tool.description,
        inputSchema: tool.input,
        annotations: {
          readOnlyHint: tool.readOnly,
          destructiveHint: false,
          openWorldHint: false,
        },
      },
      (input) => callMcpTool(tool, input, caller),
    );
  }
  return server;
}
