import { McpServer, type CallToolResult } from "@modelcontextprotocol/server";
import { logger } from "@workspace/observability/winston-logger";
import { mcpTools, toolErrorMessage, type McpCaller, type McpTool } from "@/lib/mcp/tools";
import { getTemplateVersion } from "@/lib/scaffold/template-version";

const INSTRUCTIONS = `SaaS Forge sells a SaaS starter as modules (billing, teams, AI, jobs, webhooks, ...). These tools read the user's account, plan saved projects and price downloads and upgrades. They never spend credits.

- To start a project: get_catalog, create_project with every required module, quote_download, then run the returned command after the user approves the price.
- To add modules to a project the user already downloaded: work inside that project's repository (its .saas-forge.json names the project slug), call quote_upgrade with addModules, show the price, and after approval run its command, then follow its nextSteps. Never use update_project to add modules to a downloaded project.
- Always show the credit price and get the user's explicit approval before running any create-saas-forge command. Leave database migrations (pnpm migrate) to the user.`;

function text(value: unknown, isError = false): CallToolResult {
  return {
    content: [{ type: "text", text: typeof value === "string" ? value : JSON.stringify(value, null, 2) }],
    ...(isError ? { isError: true } : {}),
  };
}

/** Runs one tool for one caller: scope check, then the tool, with errors the agent can read. */
export async function callMcpTool(tool: McpTool, input: unknown, caller: McpCaller): Promise<CallToolResult> {
  if (!caller.scopes.includes(tool.scope)) {
    return text(
      `This API key is missing the ${tool.scope} scope that ${tool.name} needs. Create a key with it in Settings → API keys.`,
      true,
    );
  }
  // The SDK validates too; parsing here keeps the quote commands safe for any caller.
  const parsed = tool.input.safeParse(input ?? {});
  if (!parsed.success) return text(`Invalid input for ${tool.name}: ${parsed.error.message}`, true);
  const started = Date.now();
  try {
    const result = await tool.run(parsed.data as never, caller);
    logger.info(`mcp.tool_called ${JSON.stringify({ tool: tool.name, userId: caller.userId, ms: Date.now() - started })}`);
    return text(result);
  } catch (err) {
    const message = toolErrorMessage(err);
    if (message) return text(message, true);
    logger.error(`mcp.tool_failed ${JSON.stringify({ tool: tool.name, userId: caller.userId, err: String(err) })}`);
    return text(`${tool.name} failed on the server. Try again later.`, true);
  }
}

/** A fresh server per request (stateless serving), with every tool bound to the caller. */
export function createSaasForgeMcpServer(caller: McpCaller): McpServer {
  const server = new McpServer(
    { name: "saas-forge", version: getTemplateVersion() },
    { instructions: INSTRUCTIONS },
  );
  for (const tool of mcpTools as McpTool[]) {
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
