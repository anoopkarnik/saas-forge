import { z } from "zod";
import db from "@workspace/database/client";
import { McpToolError, defineMcpTool, type McpTool } from "@/lib/mcp/define";
// scaffold:begin billing
import { recentUsage } from "@/lib/usage/service";
// scaffold:end billing
// scaffold:begin notifications
import { listInbox, unreadCount } from "@/lib/notifications/service";
// scaffold:end notifications

/**
 * The app's MCP tools, served at /api/mcp. Each module adds its tools inside
 * its markers, with a read scope from @workspace/auth/api-keys/scopes. Tools
 * read the API key's user only; anything that changes data or spends credits
 * needs its own review before it goes here.
 */

const limitInput = z.object({
  limit: z.number().int().min(1).max(50).default(20).describe("How many items to return, newest first."),
});

export const appMcpTools: McpTool[] = [
  defineMcpTool({
    name: "get_account",
    title: "Get account",
    description: "Return the signed-in user's id, email and name.",
    scope: "read:me",
    readOnly: true,
    input: z.object({}),
    run: async (_input, { userId }) => {
      const user = await db.user.findUnique({
        where: { id: userId },
        select: { id: true, email: true, name: true },
      });
      if (!user) throw new McpToolError("User no longer exists.");
      return { user };
    },
  }),

  defineMcpTool({
    name: "get_credits",
    title: "Get credit balance",
    description: "Return the user's credits: total, used and remaining.",
    scope: "read:credits",
    readOnly: true,
    input: z.object({}),
    run: async (_input, { userId }) => {
      const user = await db.user.findUnique({
        where: { id: userId },
        select: { creditsTotal: true, creditsUsed: true },
      });
      if (!user) throw new McpToolError("User no longer exists.");
      return {
        credits: {
          total: user.creditsTotal,
          used: user.creditsUsed,
          remaining: user.creditsTotal - user.creditsUsed,
        },
      };
    },
  }),

  // scaffold:begin billing
  defineMcpTool({
    name: "list_usage",
    title: "List credit usage",
    description: "List the user's recent credit spend, one entry per metered action, newest first.",
    scope: "read:usage",
    readOnly: true,
    input: limitInput,
    run: async ({ limit }, { userId }) => {
      const { items } = await recentUsage(userId, { limit });
      return { usage: items };
    },
  }),
  // scaffold:end billing

  // scaffold:begin multi_tenancy
  defineMcpTool({
    name: "list_workspaces",
    title: "List workspaces",
    description: "List the workspaces the user belongs to, with their role in each.",
    scope: "read:workspaces",
    readOnly: true,
    input: z.object({}),
    run: async (_input, { userId }) => {
      const memberships = await db.member.findMany({
        where: { userId },
        orderBy: { createdAt: "asc" },
        select: { role: true, organization: { select: { id: true, name: true, slug: true } } },
      });
      return {
        workspaces: memberships.map(({ role, organization }) => ({ ...organization, role })),
      };
    },
  }),
  // scaffold:end multi_tenancy

  // scaffold:begin notifications
  defineMcpTool({
    name: "list_notifications",
    title: "List notifications",
    description: "List the user's personal notifications, newest first, with the unread count.",
    scope: "read:notifications",
    readOnly: true,
    input: limitInput,
    run: async ({ limit }, { userId }) => {
      const [notifications, unread] = await Promise.all([
        listInbox(userId, null, limit),
        unreadCount(userId, null),
      ]);
      return { unread, notifications };
    },
  }),
  // scaffold:end notifications
];
