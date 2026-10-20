// @vitest-environment node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { compileScaffoldVariant, loadScaffoldRegistry, resolveWorkspacePath } from "@/lib/scaffold-modules";

// A release kit compiles an old starter with that release's own module rules.

const templateRoot = resolveWorkspacePath("templates/saas-boilerplate");
const temps: string[] = [];
const tempDir = (prefix: string) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  temps.push(dir);
  return dir;
};
afterAll(() => temps.forEach((dir) => fs.rmSync(dir, { recursive: true, force: true })));

describe("compileScaffoldVariant rulesRoot", () => {
  it("compiles with the rules found under rulesRoot", () => {
    const rulesRoot = tempDir("scaffold-rules-");
    for (const name of ["scaffold-modules", "scaffold-providers"]) {
      fs.cpSync(resolveWorkspacePath(name), path.join(rulesRoot, name), { recursive: true });
    }
    const manifestPath = path.join(rulesRoot, "scaffold-modules", "ai", "manifest.json");
    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
    manifest.unselected = { ...manifest.unselected, remove: [...(manifest.unselected?.remove ?? []), "LICENSE"] };
    fs.writeFileSync(manifestPath, JSON.stringify(manifest));

    expect(loadScaffoldRegistry(rulesRoot).modules.length).toBe(loadScaffoldRegistry().modules.length);

    const withRules = compileScaffoldVariant({
      baseRoot: templateRoot,
      tempDir: tempDir("scaffold-old-"),
      selectedModules: [],
      platforms: ["web"],
      rulesRoot,
    });
    const withoutRules = compileScaffoldVariant({
      baseRoot: templateRoot,
      tempDir: tempDir("scaffold-new-"),
      selectedModules: [],
      platforms: ["web"],
    });

    expect(fs.existsSync(path.join(withRules, "LICENSE"))).toBe(false);
    expect(fs.existsSync(path.join(withoutRules, "LICENSE"))).toBe(true);
  }, 60_000);
});
