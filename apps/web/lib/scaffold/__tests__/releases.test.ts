// @vitest-environment node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import { compareVersions, parseRelease, type Release } from "@/lib/scaffold/release-notes";
import { getProjectReleases, loadReleases } from "@/lib/scaffold/releases";
import { loadScaffoldRegistry, resolveWorkspacePath } from "@/lib/scaffold-modules";

vi.mock("@workspace/observability/winston-logger", () => ({ logger: { warn: vi.fn() } }));

const modules = loadScaffoldRegistry().modules.map((module) => module.id);

const release = (version: string, entries: Release["entries"], extra: Partial<Release> = {}): Release => ({
  version,
  date: "2026-10-01",
  highlights: [`Release ${version}`],
  entries,
  ...extra,
});

const RELEASES = [
  release("1.3.0", [{ module: "core", type: "feature", title: "Baseline" }]),
  release("1.3.1", [
    { module: "core", type: "fix", title: "Sign-in redirect" },
    { module: "ai", type: "feature", title: "Streaming chat" },
  ]),
  release("1.4.0", [
    { module: "billing", type: "security", title: "Verify Stripe webhook signatures" },
    { module: "multi_tenancy", type: "breaking", title: "Rename workspace slugs", migration: true },
  ]),
  release("1.5.0", [{ module: "core", type: "feature", title: "Not deployed yet" }]),
];

describe("release notes", () => {
  it("lists every problem in an invalid file", () => {
    expect(() =>
      parseRelease({ version: "1.4", date: "soon", highlights: [], entries: [{ module: "crm", type: "chore", title: "" }] }, modules),
    ).toThrow(/version must look like 1\.2\.3.*date must be YYYY-MM-DD.*module must be "core".*type must be one of.*title is required/);
  });

  it("orders versions numerically, unknown first", () => {
    expect(["1.10.0", "unknown", "1.9.2", "1.9.10"].sort(compareVersions)).toEqual(["unknown", "1.9.2", "1.9.10", "1.10.0"]);
  });

  it("shows a v1.3.0 project the releases since, up to the deployed version, for its modules", () => {
    const result = getProjectReleases({ templateVersion: "1.3.0", modules: ["billing"] }, RELEASES, "1.4.0");

    expect(result.behind).toBe(2);
    expect(result.releases.map((entry) => entry.version)).toEqual(["1.3.1", "1.4.0"]);
    expect(result.releases[0]!.entries.map((entry) => entry.title)).toEqual(["Sign-in redirect"]);
    expect(result.releases[1]!.entries.map((entry) => entry.title)).toEqual(["Verify Stripe webhook signatures"]);
  });

  it("raises a security advisory only on projects with the affected module", () => {
    const withBilling = getProjectReleases({ templateVersion: "1.3.0", modules: ["billing"] }, RELEASES, "1.4.0");
    const without = getProjectReleases({ templateVersion: "1.3.0", modules: ["ai"] }, RELEASES, "1.4.0");
    const upToDate = getProjectReleases({ templateVersion: "1.4.0", modules: ["billing"] }, RELEASES, "1.4.0");

    expect(withBilling.advisories).toEqual([
      expect.objectContaining({ version: "1.4.0", module: "billing", title: "Verify Stripe webhook signatures" }),
    ]);
    expect(without.advisories).toEqual([]);
    expect(upToDate).toMatchObject({ behind: 0, advisories: [] });
  });

  it("loads published releases only, skipping drafts and invalid files", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "releases-"));
    const write = (name: string, value: unknown) => fs.writeFileSync(path.join(dir, name), JSON.stringify(value));
    write("1.4.0.json", RELEASES[2]);
    write("1.3.1.json", RELEASES[1]);
    write("1.5.0.json", { ...RELEASES[3], draft: true });
    write("broken.json", { version: "nope" });

    expect(loadReleases(dir).map((entry) => entry.version)).toEqual(["1.3.1", "1.4.0"]);
  });

  it("keeps the repo's own release files valid", () => {
    const dir = resolveWorkspacePath("releases");
    for (const file of fs.existsSync(dir) ? fs.readdirSync(dir).filter((name) => name.endsWith(".json")) : []) {
      expect(() => parseRelease(JSON.parse(fs.readFileSync(path.join(dir, file), "utf-8")), modules), file).not.toThrow();
    }
  });
});
