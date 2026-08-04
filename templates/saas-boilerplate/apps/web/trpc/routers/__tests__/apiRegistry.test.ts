// @vitest-environment node
import { describe, it, expect } from "vitest";
import { appRouter } from "../_app";
import { API_REGISTRY } from "../../apiRegistry";

/**
 * Drift test: keeps trpc/apiRegistry.ts in sync with the live router.
 *
 * The registry powers the Admin → API Management page. This test fails if a
 * procedure is added, removed, renamed, or switched between query/mutation
 * without a matching registry update. Role (access) is not stored on the
 * router, so it cannot be auto-verified here — presence and type are.
 */

// Live surface: flat "path" -> "query" | "mutation" from the built router.
const liveProcedures = new Map<string, string>(
  Object.entries((appRouter as any)._def.procedures).map(
    ([path, proc]) => [path, (proc as any)._def.type as string],
  ),
);

// Registry surface: "group.name" -> type.
const registryProcedures = new Map<string, string>(
  API_REGISTRY.flatMap((group) =>
    group.calls.map((call) => [`${group.group}.${call.name}`, call.type] as const),
  ),
);

describe("API registry drift", () => {
  it("has no procedures missing from the registry", () => {
    const missing = [...liveProcedures.keys()]
      .filter((path) => !registryProcedures.has(path))
      .sort();
    expect(missing, "add these to trpc/apiRegistry.ts").toEqual([]);
  });

  it("has no stale entries not present on the router", () => {
    const stale = [...registryProcedures.keys()]
      .filter((path) => !liveProcedures.has(path))
      .sort();
    expect(stale, "remove these from trpc/apiRegistry.ts").toEqual([]);
  });

  it("records the correct query/mutation type for every call", () => {
    const mismatches = [...registryProcedures.entries()]
      .filter(([path, type]) => liveProcedures.get(path) !== type)
      .map(([path, type]) => `${path}: registry=${type} live=${liveProcedures.get(path)}`)
      .sort();
    expect(mismatches).toEqual([]);
  });
});
