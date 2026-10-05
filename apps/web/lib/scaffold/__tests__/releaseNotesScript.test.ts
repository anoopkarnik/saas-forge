// @vitest-environment node
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

// scripts/ is plain JavaScript run by Node, so it is loaded by path, untyped.
const script = fileURLToPath(new URL("../../../../../scripts/release-notes.mjs", import.meta.url));
const { entryFromCommit } = (await import(/* @vite-ignore */ script)) as {
  entryFromCommit: (commit: { subject: string; body: string; files: string[] }, modules: string[]) => unknown;
};

const MODULES = ["billing", "multi_tenancy", "ai", "ai_agents", "api_keys"];
const entry = (subject: string, files: string[] = [], body = "") => entryFromCommit({ subject, body, files }, MODULES);

describe("release notes draft", () => {
  it("maps commit types and skips housekeeping", () => {
    expect(entry("feat(billing): stripe tax (#12)")).toEqual({ module: "billing", type: "feature", title: "stripe tax" });
    expect(entry("perf: faster builds")).toMatchObject({ module: "core", type: "fix" });
    expect(entry("fix(security): verify webhook signatures")).toMatchObject({ type: "security" });
    expect(entry("feat(api-keys)!: new key format")).toMatchObject({ module: "api_keys", type: "breaking" });
    expect(entry("fix: x", [], "BREAKING CHANGE: env renamed")).toMatchObject({ type: "breaking" });
    expect(entry("chore: bump deps")).toBeNull();
    expect(entry("not conventional")).toBeNull();
  });

  it("finds the module from the subject, then from the one module folder touched", () => {
    const both = ["scaffold-modules/ai/manifest.json", "scaffold-modules/ai_agents/manifest.json"];
    expect(entry("feat(scaffold): AI agents backend as its own module", both)).toMatchObject({ module: "ai_agents" });
    expect(entry("feat: engine rewrite", both)).toMatchObject({ module: "core" });
    expect(entry("feat: workspace invites", ["scaffold-modules/multi_tenancy/manifest.json"])).toMatchObject({
      module: "multi_tenancy",
    });
  });

  it("flags commits that ship a migration", () => {
    expect(entry("feat: orgs", ["templates/saas-boilerplate/packages/database/prisma/migrations/2026_x/migration.sql"])).toMatchObject({
      migration: true,
    });
  });
});
