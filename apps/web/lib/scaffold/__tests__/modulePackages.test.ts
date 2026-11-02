// @vitest-environment node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  compileScaffoldVariant,
  findScaffoldLeaks,
  loadScaffoldRegistry,
  resolveWorkspacePath,
} from "@/lib/scaffold-modules";

const ownership = {
  billing: "billing",
  notifications: "notifications",
  audit_log: "audit",
  webhooks: "webhooks",
  feature_flags: "flags",
  onboarding: "onboarding",
  mcp: "mcp",
} as const;

describe("module package ownership", () => {
  it("allows descriptive provider links while rejecting an unselected analytics SDK", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "provider-link-"));
    const selected = loadScaffoldRegistry()
      .modules.filter((module) => module.id !== "analytics")
      .map((module) => module.id);
    try {
      const source = path.join(dir, "example.ts");
      fs.writeFileSync(source, 'export const url = "https://posthog.com";');
      expect(findScaffoldLeaks(dir, selected)).toEqual([]);
      fs.writeFileSync(source, 'import("posthog-js");');
      expect(findScaffoldLeaks(dir, selected).length).toBeGreaterThan(0);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
  function fixture(actions: Array<Record<string, unknown>>) {
    const dir = fs.mkdtempSync(
      path.join(os.tmpdir(), "package-removal-rules-"),
    );
    const baseRoot = path.join(dir, "base");
    const rulesRoot = path.join(dir, "rules");
    fs.mkdirSync(path.join(baseRoot, "packages/billing"), { recursive: true });
    fs.writeFileSync(
      path.join(baseRoot, "packages/billing/package.json"),
      JSON.stringify({
        dependencies: { "@workspace/notifications": "workspace:*" },
      }),
    );
    const registry = {
      baseCreditsCost: 0,
      modules: loadScaffoldRegistry().modules.filter((module) =>
        ["billing", "notifications"].includes(module.id),
      ),
    };
    registry.modules.forEach((module, i) => {
      const folder = path.join(rulesRoot, "scaffold-modules", module.id);
      fs.mkdirSync(folder, { recursive: true });
      fs.writeFileSync(
        path.join(folder, "manifest.json"),
        JSON.stringify({ id: module.id, unselected: actions[i] }),
      );
    });
    return {
      dir,
      compile: () =>
        compileScaffoldVariant({
          baseRoot,
          rulesRoot,
          registry,
          tempDir: path.join(dir, "out"),
          selectedModules: [],
          platforms: ["web"],
        }),
    };
  }

  it("can prune an optional dependency after its consumer package was removed", () => {
    const { dir, compile } = fixture([
      { remove: ["packages/billing"] },
      {
        jsonRemove: [
          {
            file: "packages/billing/package.json",
            keys: { dependencies: ["@workspace/notifications"] },
          },
        ],
      },
    ]);
    try {
      expect(compile).not.toThrow();
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it("still rejects a dependency action targeting an unexplained missing file", () => {
    const { dir, compile } = fixture([
      {},
      {
        jsonRemove: [
          {
            file: "packages/typo/package.json",
            keys: { dependencies: ["@workspace/notifications"] },
          },
        ],
      },
    ]);
    try {
      expect(compile).toThrow();
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it.each([false, true])(
    "ships backend packages only for selected modules (all=%s)",
    (all) => {
      const tempDir = fs.mkdtempSync(
        path.join(os.tmpdir(), "module-packages-"),
      );
      try {
        compileScaffoldVariant({
          baseRoot: resolveWorkspacePath("templates/saas-boilerplate"),
          tempDir,
          selectedModules: all
            ? loadScaffoldRegistry().modules.map((module) => module.id)
            : [],
          platforms: ["web"],
        });
        const web = JSON.parse(
          fs.readFileSync(path.join(tempDir, "apps/web/package.json"), "utf8"),
        );
        for (const name of Object.values(ownership)) {
          expect(
            fs.existsSync(path.join(tempDir, `packages/${name}/package.json`)),
            name,
          ).toBe(all);
          expect(web.dependencies[`@workspace/${name}`], name).toBe(
            all ? "workspace:*" : undefined,
          );
        }
      } finally {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    },
  );
});
