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
  type ScaffoldModuleId,
} from "@/lib/scaffold-modules";

// Fast static half of the scaffold variant matrix: every module subset compiles
// and leaves no markers or unselected-module identifiers behind. Installs,
// prisma generate and typechecks run in `pnpm scaffold:matrix`.

const templateRoot = resolveWorkspacePath("templates/saas-boilerplate");
const modules = loadScaffoldRegistry()
  .modules.filter((module) => module.implemented !== false)
  .map((module) => module.id);
const subsets = Array.from({ length: 2 ** modules.length }, (_, mask) =>
  modules.filter((_, index) => mask & (1 << index)),
);

describe("scaffold variants", () => {
  it.each(subsets.map((selection) => [selection.join("+") || "none", selection] as const))(
    "%s compiles without leaks",
    (_name, selection: ScaffoldModuleId[]) => {
      const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "scaffold-variant-"));
      try {
        compileScaffoldVariant({
          baseRoot: templateRoot,
          tempDir,
          selectedModules: selection,
          platforms: ["web", "desktop", "mobile"],
        });
        expect(findScaffoldLeaks(tempDir, selection)).toEqual([]);
      } finally {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    },
  );
});
