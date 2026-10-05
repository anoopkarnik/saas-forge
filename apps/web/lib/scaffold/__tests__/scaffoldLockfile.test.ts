// @vitest-environment node
import { describe, expect, it } from "vitest";
import { pruneLockfileImporters } from "@/lib/scaffold-modules";

const lockfile = `lockfileVersion: '9.0'

importers:

  .:
    devDependencies:
      dependency-cruiser:
        specifier: ^18.5.0
        version: 18.5.0
      turbo:
        specifier: ^2.5.5
        version: 2.7.4

  apps/mobile:
    dependencies:
      expo:
        specifier: ~54.0.0
        version: 54.0.1

  apps/web:
    dependencies:
      '@workspace/ai':
        specifier: workspace:*
        version: link:../../packages/ai
      next:
        specifier: 15.5.0
        version: 15.5.0(react@19.2.4)
    devDependencies:
      stripe:
        specifier: ^20.4.0
        version: 20.4.0
    dependenciesMeta:
      next:
        injected: true

packages:

  turbo@2.7.4:
    resolution: {integrity: sha512-x}
`;

const manifests: Record<string, Record<string, Record<string, string>>> = {
  ".": { devDependencies: { turbo: "^2.5.5" } },
  "apps/web": { dependencies: { next: "15.5.0" } },
};

describe("pruneLockfileImporters", () => {
  const pruned = pruneLockfileImporters(lockfile, (dir) => manifests[dir] ?? null);

  it("drops importers whose package.json is gone", () => {
    expect(pruned).not.toContain("apps/mobile");
    expect(pruned).not.toContain("expo");
  });

  it("drops dependencies a manifest no longer declares, including quoted keys", () => {
    expect(pruned).not.toContain("dependency-cruiser");
    expect(pruned).not.toContain("@workspace/ai");
    expect(pruned).toContain("      turbo:\n        specifier: ^2.5.5\n        version: 2.7.4");
    expect(pruned).toContain("      next:\n        specifier: 15.5.0\n        version: 15.5.0(react@19.2.4)");
  });

  it("omits a dependency section once it is empty, but keeps other importer fields", () => {
    expect(pruned).not.toMatch(/apps\/web:[\s\S]*devDependencies:[\s\S]*packages:/);
    expect(pruned).toContain("    dependenciesMeta:\n      next:\n        injected: true");
  });

  it("leaves everything outside the importers block untouched", () => {
    expect(pruned.startsWith("lockfileVersion: '9.0'\n\nimporters:\n")).toBe(true);
    expect(pruned.endsWith("packages:\n\n  turbo@2.7.4:\n    resolution: {integrity: sha512-x}\n")).toBe(true);
  });

  it("is a no-op when every importer matches", () => {
    const all: typeof manifests = {
      ".": { devDependencies: { "dependency-cruiser": "", turbo: "" } },
      "apps/mobile": { dependencies: { expo: "" } },
      "apps/web": { dependencies: { "@workspace/ai": "", next: "" }, devDependencies: { stripe: "" } },
    };
    expect(pruneLockfileImporters(lockfile, (dir) => all[dir] ?? null)).toBe(lockfile);
  });
});
