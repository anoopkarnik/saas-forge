import { appMcpTools } from "@workspace/mcp/catalog";
import { createMcpServer } from "@workspace/mcp/server";
import type { McpCaller, McpTool } from "@workspace/mcp/define";
import { platformMcpInstructions, platformMcpTools } from "./platform";
import { getSiteConfig } from "@/lib/site-config/service";
export { callMcpTool } from "@workspace/mcp/server";

export function listMcpTools(): McpTool[] {
  return [...appMcpTools, ...platformMcpTools];
}

/** Bind application branding and root-only platform tools per request. */
export async function createAppMcpServer(caller: McpCaller) {
  return createMcpServer(caller, {
    appName: (await getSiteConfig())["branding.saasName"],
    tools: listMcpTools(),
    platformInstructions: platformMcpInstructions,
  });
}
