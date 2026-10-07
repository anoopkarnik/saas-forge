// @vitest-environment node
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { quoteFromCatalog } from "@workspace/ui/lib/constants/scaffold-modules";
import {
  calculateScaffoldCredits,
  resolveWorkspacePath,
  validateSelectedModules,
  type ScaffoldModuleId,
} from "@/lib/scaffold-modules";
import { scaffoldCatalogRouter } from "../scaffoldCatalogProcedures";

const caller = scaffoldCatalogRouter.createCaller({} as never);

const moduleIdSchema = z.enum(["billing", "multi_tenancy", "ai", "ai_agents", "api_keys", "jobs", "notifications", "audit_log", "webhooks", "feature_flags"]);
const registrySchema = z
  .object({
    baseCreditsCost: z.number().int().nonnegative(),
    tierUpgradeCreditsPerStep: z.number().int().nonnegative(),
    previewSnippets: z.array(z.string()),
    modules: z.array(
      z
        .object({
          id: moduleIdSchema,
          label: z.string().min(1),
          description: z.string().min(1),
          default: z.boolean(),
          creditsCost: z.number().int().nonnegative(),
          requires: z.array(moduleIdSchema),
          incompatibleWith: z.array(moduleIdSchema),
          downloadEnabled: z.boolean().optional(),
          implemented: z.boolean().optional(),
        })
        .strict(),
    ),
  })
  .strict();

describe("scaffold-modules/registry.json", () => {
  it("matches the registry schema", () => {
    const registry = JSON.parse(
      fs.readFileSync(resolveWorkspacePath("scaffold-modules/registry.json"), "utf-8"),
    );
    expect(() => registrySchema.parse(registry)).not.toThrow();
  });
});

describe("scaffold.catalog", () => {
  it("serves prices, copy and availability from the registry", async () => {
    const catalog = await caller.catalog();
    expect(catalog.baseCredits).toBeGreaterThan(0);
    for (const entry of catalog.modules) {
      expect(entry.description.length).toBeGreaterThan(0);
    }
    const notifications = catalog.modules.find((module) => module.id === "notifications");
    expect(notifications).toMatchObject({ available: true, creditsCost: 5 });
    const apiKeys = catalog.modules.find((module) => module.id === "api_keys");
    expect(apiKeys).toMatchObject({ available: true, creditsCost: 5 });
  });

  it("quotes exactly what every module combination is charged", async () => {
    const catalog = await caller.catalog();
    const ids = catalog.modules.filter((module) => module.available).map((module) => module.id);
    const subsets = Array.from({ length: 2 ** ids.length }, (_, mask) =>
      ids.filter((_, index) => mask & (1 << index)),
    ).filter((selection) => {
      try {
        validateSelectedModules(selection);
        return true;
      } catch {
        return false;
      }
    });

    for (const selection of subsets) {
      const charged = calculateScaffoldCredits(selection as ScaffoldModuleId[]).totalCredits;
      expect(quoteFromCatalog(catalog, selection).totalCredits, selection.join("+") || "none").toBe(charged);
      expect((await caller.quote({ modules: selection })).totalCredits).toBe(charged);
    }
  });
});

describe("scaffold.quote", () => {
  it("rejects unknown modules", async () => {
    await expect(caller.quote({ modules: ["payments"] })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
});

// Clients must read prices from scaffold.catalog; a literal credit amount in
// client code is how the 10-vs-20 base price drift happened.
describe("client pricing drift", () => {
  const roots = ["packages/ui/src", "apps/mobile", "apps/desktop/src", "apps/web/components", "apps/web/app/(home)"];
  const pattern = /(?:CREDITS?_COST|creditsCost|baseCredits)\s*[:=]\s*\d/;

  function walk(dir: string, out: string[] = []): string[] {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name === "node_modules" || entry.name.startsWith(".")) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full, out);
      else if (/\.tsx?$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name)) out.push(full);
    }
    return out;
  }

  it("has no hardcoded scaffold credit amounts", () => {
    const offenders = roots
      .map((root) => resolveWorkspacePath(root))
      .filter((root) => fs.existsSync(root))
      .flatMap((root) => walk(root))
      .filter((file) => pattern.test(fs.readFileSync(file, "utf-8")))
      .map((file) => path.relative(resolveWorkspacePath("."), file));
    expect(offenders).toEqual([]);
  });
});
