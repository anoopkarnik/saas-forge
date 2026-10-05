// @vitest-environment node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { composePreview, diffPreview } from "@workspace/ui/lib/scaffold-preview";
import {
  compileScaffoldVariant,
  loadScaffoldRegistry,
  resolveWorkspacePath,
  validateSelectedModules,
  type ScaffoldModuleId,
} from "@/lib/scaffold-modules";
import { isIgnoredPath } from "@/lib/scaffold/build-cache";
import { buildPreviewIndex, categorize } from "@/lib/scaffold/preview-index";

const scaffoldRoot = resolveWorkspacePath("templates/saas-boilerplate");
const index = buildPreviewIndex(scaffoldRoot);

function actualVariant(modules: ScaffoldModuleId[], platforms: string[]) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "preview-parity-"));
  try {
    compileScaffoldVariant({ baseRoot: scaffoldRoot, tempDir: dir, selectedModules: modules, platforms });
    const files: string[] = [];
    const walk = (current: string) => {
      for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
        const full = path.join(current, entry.name);
        const rel = path.relative(dir, full);
        if (isIgnoredPath(rel)) continue;
        if (entry.isDirectory()) walk(full);
        else if (entry.isFile()) files.push(rel.split(path.sep).join("/"));
      }
    };
    walk(dir);
    const envExample = fs.readFileSync(path.join(dir, "apps/web/.env.example"), "utf-8");
    const envVars = [...envExample.matchAll(/^([A-Z_][A-Z0-9_]*)=/gm)].map((match) => match[1]!);
    return { files: files.sort(), envVars: envVars.sort() };
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

// Same coverage as the PR matrix: none, every module alone, every pair, all.
const modules = loadScaffoldRegistry()
  .modules.filter((module) => module.implemented !== false)
  .map((module) => module.id);
const selections = Array.from({ length: 2 ** modules.length }, (_, mask) =>
  modules.filter((_, bit) => mask & (1 << bit)),
)
  .filter((selection) => selection.length <= 2 || selection.length === modules.length)
  .filter((selection) => {
    try {
      validateSelectedModules(selection);
      return true;
    } catch {
      return false;
    }
  });

describe("preview index", () => {
  it.each(selections.map((selection) => [selection.join("+") || "none", selection] as const))(
    "%s: the composed preview matches the real download",
    (_name, selection) => {
      for (const platforms of [["web", "desktop", "mobile"], ["web"]]) {
        const actual = actualVariant(selection, platforms);
        const preview = composePreview(index, selection, platforms);
        expect(preview.files.map((file) => file.path).sort()).toEqual(actual.files);
        expect([...preview.envVars].sort()).toEqual(actual.envVars);
      }
    },
    60_000,
  );

  it("attributes agent files to ai_agents, not ai", () => {
    const owner = (file: string) => index.files.find((entry) => entry.path === file)?.module;
    expect(owner("apps/web/trpc/routers/aiJobsProcedures.ts")).toBe("ai_agents");
    expect(owner("apps/web/trpc/routers/aiProcedures.ts")).toBe("ai");
    expect(owner("apps/web/trpc/routers/supportProcedures.ts")).toBeNull();
    expect(index.models.find((model) => model.name === "AiJobRun")?.module).toBe("ai_agents");
  });

  it("diffs a module toggle", () => {
    const { added, removed } = diffPreview(
      index,
      { modules: [], platforms: ["web"] },
      { modules: ["billing"], platforms: ["web"] },
    );
    expect(added.length).toBeGreaterThan(0);
    expect(added.every((file) => file.module === "billing")).toBe(true);
    expect(removed).toEqual([]);
  });

  it("categorizes routes, procedures and components", () => {
    expect(categorize("apps/web/app/api/v1/me/route.ts")).toBe("route");
    expect(categorize("apps/web/trpc/routers/billingProcedures.ts")).toBe("procedure");
    expect(categorize("packages/ui/src/components/home/SettingsDialog.tsx")).toBe("component");
    expect(categorize("README.md")).toBe("other");
  });
});
