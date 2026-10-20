// @vitest-environment node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import JSZip from "jszip";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const { mockJobs } = vi.hoisted(() => ({ mockJobs: vi.fn(async (): Promise<Array<{ toModules: string[] }>> => []) }));
vi.mock("@workspace/database/client", () => ({ default: { scaffoldJob: { findMany: mockJobs } } }));

import { resolveWorkspacePath, type ScaffoldModuleId } from "@/lib/scaffold-modules";
import type { UpgradeBase } from "@/lib/scaffold/release-snapshots";
import {
  buildUpgradeKit,
  buildUpgradeKitFromBase,
  previewUpgrade,
  resolveProjectUpgradeBase,
  resolveUpgradeBase,
} from "@/lib/scaffold/service";
import { getTemplateVersion } from "@/lib/scaffold/template-version";

// A release kit diffs the project's own release (an old snapshot, compiled with
// its own rules) against the deployed starter.

const SHARED = "apps/web/lib/seo.ts";
const BILLING_ONLY = "apps/web/trpc/routers/billingProcedures.ts";
const SKIP = new Set(["node_modules", ".next", ".turbo"]);

let base: UpgradeBase;
let root: string;

beforeAll(() => {
  const generated = resolveWorkspacePath(".generated/saas-boilerplate");
  const scaffoldRoot = fs.existsSync(generated) ? generated : resolveWorkspacePath("templates/saas-boilerplate");
  root = fs.mkdtempSync(path.join(os.tmpdir(), "release-kit-base-"));
  const starterRoot = path.join(root, "starter");
  const rulesRoot = path.join(root, "rules");
  fs.cpSync(scaffoldRoot, starterRoot, { recursive: true, filter: (src) => !SKIP.has(path.basename(src)) });
  for (const name of ["scaffold-modules", "scaffold-providers"]) {
    fs.cpSync(resolveWorkspacePath(name), path.join(rulesRoot, name), { recursive: true });
  }
  // The old release: the shared file and a billing-only file differed.
  for (const rel of [SHARED, BILLING_ONLY]) {
    const file = path.join(starterRoot, rel);
    fs.writeFileSync(file, `// old release\n${fs.readFileSync(file, "utf-8")}`);
  }
  base = { version: "1.0.0", starterRoot, rulesRoot };
}, 120_000);

afterAll(() => fs.rmSync(root, { recursive: true, force: true }));

async function readKit(input: Parameters<typeof buildUpgradeKit>[0]) {
  const kit = buildUpgradeKit(input);
  const zip = await JSZip.loadAsync(new Uint8Array(await new Response(kit.stream).arrayBuffer()));
  const names = Object.values(zip.files).filter((file) => !file.dir).map((file) => file.name);
  const spec = JSON.parse(await zip.file("demo/UPGRADE_SPEC.json")!.async("string"));
  return { zip, names, spec };
}

const kitInput = (fromModules: ScaffoldModuleId[], toModules: ScaffoldModuleId[]) => ({
  fromModules,
  toModules,
  fromTierId: "tier-1",
  toTierId: "tier-1",
  platforms: ["web"],
  name: "Demo",
  projectName: "demo",
  versionId: "balanced",
  config: {},
});

describe("release kit", () => {
  it("stages only the changes to files the project has", async () => {
    const { zip, names, spec } = await readKit({ ...kitInput([], []), fromBase: base, releases: [] });

    expect(spec).toMatchObject({ kind: "release", fromVersion: "1.0.0", toVersion: getTemplateVersion() });
    expect(spec.changedFiles).toEqual({ added: [], modified: [SHARED], removed: [] });
    expect(names.filter((name) => name.startsWith("demo/.upgrade/"))).toEqual([`demo/.upgrade/${SHARED}`]);
    expect(await zip.file(`demo/.upgrade-base/${SHARED}`)!.async("string")).toMatch(/^\/\/ old release\n/);
    expect(names.some((name) => name.includes("billingProcedures"))).toBe(false);
    expect(names).toContain("demo/.claude/commands/upgrade-boilerplate.md");
  }, 60_000);

  it("carries release changes in a module upgrade from an old release", async () => {
    const { spec, names } = await readKit({ ...kitInput([], ["billing"]), fromBase: base });

    expect(spec.kind).toBe("upgrade");
    expect(spec.changedFiles.modified).toContain(SHARED);
    expect(spec.changedFiles.added).toContain(BILLING_ONLY);
    expect(names).toContain(`demo/.upgrade-base/${SHARED}`);
  }, 60_000);

  it("previews exactly what the kit stages", async () => {
    const preview = previewUpgrade({ ...kitInput([], []), fromBase: base });
    const { spec } = await readKit({ ...kitInput([], []), fromBase: base });
    expect(preview.files).toEqual({
      added: spec.changedFiles.added.length,
      modified: spec.changedFiles.modified.length,
      removed: spec.changedFiles.removed.length,
    });
  }, 60_000);
});

describe("resolveUpgradeBase", () => {
  const latest = getTemplateVersion();

  it("rejects a version that is not x.y.z", async () => {
    expect(await resolveUpgradeBase("abc", vi.fn())).toEqual({ status: "invalid" });
  });

  it("is current on the latest version or a newer one", async () => {
    const load = vi.fn();
    expect(await resolveUpgradeBase(latest, load)).toEqual({ status: "current" });
    expect(await resolveUpgradeBase("999.0.0", load)).toEqual({ status: "current" });
    expect(load).not.toHaveBeenCalled();
  });

  it("finds the snapshot of an older version, or reports it missing", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(await resolveUpgradeBase("0.0.1", vi.fn(async () => base))).toEqual({ status: "snapshot", base });
    expect(await resolveUpgradeBase("0.0.1", vi.fn(async () => null))).toEqual({ status: "missing", version: "0.0.1" });
  });

  it("says where to look when a snapshot is missing", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    await resolveUpgradeBase("0.0.1", vi.fn(async () => null));
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("R2_SECRET_ACCESS_KEY"));
  });

  it("treats a storage failure as a missing snapshot, so paid upgrades keep working", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const load = vi.fn(async () => {
      throw new Error("R2 503");
    });
    expect(await resolveUpgradeBase("0.0.1", load)).toEqual({ status: "missing", version: "0.0.1" });
  });
});

describe("resolveProjectUpgradeBase", () => {
  const load = vi.fn(async () => base);
  beforeEach(() => mockJobs.mockClear());

  it("uses the old release only for modules the user has a delivered build of", async () => {
    mockJobs.mockResolvedValueOnce([{ toModules: ["billing"] }, { toModules: ["ai"] }]);
    expect(await resolveProjectUpgradeBase("u1", ["billing", "ai"], "0.0.1", load)).toEqual({ status: "snapshot", base });
    expect(mockJobs).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: "u1", status: "ready" } }));
  });

  it("refuses modules saved on the project but never bought", async () => {
    mockJobs.mockResolvedValueOnce([{ toModules: ["billing"] }]);
    expect(await resolveProjectUpgradeBase("u1", ["billing", "ai"], "0.0.1", load)).toEqual({ status: "not_owned" });
  });

  it("refuses a user with no delivered build at all", async () => {
    mockJobs.mockResolvedValueOnce([]);
    expect(await resolveProjectUpgradeBase("u1", [], "0.0.1", load)).toEqual({ status: "not_owned" });
  });

  it("does not look up ownership for a current project", async () => {
    expect(await resolveProjectUpgradeBase("u1", ["billing"], getTemplateVersion(), load)).toEqual({ status: "current" });
    expect(mockJobs).not.toHaveBeenCalled();
  });
});

describe("buildUpgradeKitFromBase", () => {
  const broken = () => ({ version: "1.0.0", starterRoot: base.starterRoot, rulesRoot: path.join(root, "no-rules") });

  it("falls back to the latest-vs-latest kit when the old release no longer compiles", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const kit = buildUpgradeKitFromBase({ ...kitInput([], ["billing"]), fromBase: broken() }, { releaseOnly: false });
    const zip = await JSZip.loadAsync(new Uint8Array(await new Response(kit.stream).arrayBuffer()));
    const spec = JSON.parse(await zip.file("demo/UPGRADE_SPEC.json")!.async("string"));
    expect(spec.fromVersion).toBe(getTemplateVersion());
    expect(spec.changedFiles.added).toContain(BILLING_ONLY);
  }, 60_000);

  it("cannot fall back for a release-only kit", () => {
    expect(() => buildUpgradeKitFromBase({ ...kitInput([], []), fromBase: broken() }, { releaseOnly: true })).toThrow();
  });
});
