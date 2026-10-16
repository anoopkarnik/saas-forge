import { z } from "zod";

/**
 * Saved-project input schemas shared by the v1 REST routes and the MCP tools,
 * so both transports accept exactly the same fields. Platform-only.
 */
export const createProjectInput = z.object({
  name: z.string().trim().min(1).max(80),
  productTypeId: z.string().trim().min(1).optional(),
  tierId: z.string().trim().min(1).default("tier-1"),
  versionId: z.string().trim().min(1).default("balanced"),
  platforms: z.array(z.string()).min(1).default(["web"]),
  modules: z.array(z.string()).default([]),
  config: z.record(z.string(), z.any()).default({}),
});

export const updateProjectInput = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  productTypeId: z.string().trim().min(1).nullable().optional(),
  tierId: z.string().trim().min(1).optional(),
  versionId: z.string().trim().min(1).optional(),
  platforms: z.array(z.string()).min(1).optional(),
  modules: z.array(z.string()).optional(),
  config: z.record(z.string(), z.any()).optional(),
});
