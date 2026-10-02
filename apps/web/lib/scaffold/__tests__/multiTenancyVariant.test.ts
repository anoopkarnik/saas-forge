// @vitest-environment node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import {
  compileScaffoldVariant,
  resolveWorkspacePath,
  type ScaffoldModuleId,
} from "@/lib/scaffold-modules";

// Compiles real scaffold variants from the managed starter and checks that the
// multi_tenancy module strips cleanly (no dangling imports, schema without org
// models) in combination with the other strip-on-unselect modules.

const templateRoot = resolveWorkspacePath("templates/saas-boilerplate");
const tempDirs: string[] = [];

function compile(selectedModules: ScaffoldModuleId[]) {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "mt-variant-"));
  tempDirs.push(tempDir);
  compileScaffoldVariant({
    baseRoot: templateRoot,
    tempDir,
    selectedModules,
    platforms: ["web", "desktop", "mobile"],
  });
  return tempDir;
}

function sourceFiles(root: string): string[] {
  const out: string[] = [];
  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name === "node_modules" || entry.name.startsWith(".")) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (/\.(ts|tsx|prisma)$/.test(entry.name)) out.push(full);
    }
  };
  for (const top of ["apps/web", "apps/desktop", "apps/mobile", "packages"]) {
    const dir = path.join(root, top);
    if (fs.existsSync(dir)) walk(dir);
  }
  return out;
}

// Module-owned files that must not be imported once the module is stripped.
const REMOVED_IMPORT_PATTERNS = [
  /components\/organizations\/(WorkspaceSwitcher|TeamSettings|CreateWorkspaceDialog|TeamSettingsPanel)/,
  /organization-helpers/,
  /resend\/organization/,
  /from ['"]\.\.?\/(\.\.\/)?org['"]/,
  /organizationProcedures/,
  /lib\/organization-api/,
];

function danglingImports(root: string) {
  return sourceFiles(root).flatMap((file) => {
    const text = fs.readFileSync(file, "utf-8");
    return REMOVED_IMPORT_PATTERNS.filter((re) => re.test(text)).map(
      (re) => `${path.relative(root, file)} -> ${re}`,
    );
  });
}

function schema(root: string) {
  const dir = path.join(root, "packages/database/prisma");
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".prisma"))
    .map((f) => fs.readFileSync(path.join(dir, f), "utf-8"))
    .join("\n");
}

afterAll(() => {
  for (const dir of tempDirs) fs.rmSync(dir, { recursive: true, force: true });
});

describe("multi_tenancy scaffold variants", () => {
  it.each<[string, ScaffoldModuleId[]]>([
    ["nothing selected", []],
    ["ai + billing selected", ["ai", "billing"]],
  ])("strips organizations cleanly with %s", (_label, modules) => {
    const root = compile(modules);

    expect(danglingImports(root)).toEqual([]);
    expect(fs.existsSync(path.join(root, "apps/web/app/(home)/organization"))).toBe(false);
    expect(fs.existsSync(path.join(root, "packages/ui/src/components/organizations"))).toBe(false);
    expect(fs.readFileSync(path.join(root, "apps/web/trpc/routers/_app.ts"), "utf-8")).not.toContain(
      "organization",
    );

    const migrations = fs.readdirSync(path.join(root, "packages/database/prisma/migrations"));
    expect(migrations.filter((m) => m.endsWith("_add_organizations"))).toEqual([]);

    const prisma = schema(root);
    expect(prisma).not.toMatch(/model (Organization|Member|OrganizationInvitation) /);
    expect(prisma).not.toMatch(/\bMember\[\]|OrganizationInvitation\[\]|activeOrganizationId/);

    const dbPackage = JSON.parse(
      fs.readFileSync(path.join(root, "packages/database/package.json"), "utf-8"),
    );
    expect(dbPackage.scripts["backfill:orgs"]).toBeUndefined();

    // Slots stay importable but render nothing.
    for (const slot of [
      "apps/web/components/organizations/WorkspaceSlot.tsx",
      "apps/desktop/src/renderer/src/components/organizations/WorkspaceSlot.tsx",
      "apps/mobile/components/organizations/OrgSelector.tsx",
    ]) {
      expect(fs.readFileSync(path.join(root, slot), "utf-8")).toContain("return null");
    }
  });

  it.each<[string, ScaffoldModuleId[]]>([
    ["alone", ["multi_tenancy"]],
    ["with ai + billing", ["multi_tenancy", "ai", "billing"]],
  ])("keeps the full feature when selected %s", (_label, modules) => {
    const root = compile(modules);

    expect(fs.existsSync(path.join(root, "apps/web/trpc/routers/organizationProcedures.ts"))).toBe(true);
    expect(fs.readFileSync(path.join(root, "apps/web/trpc/routers/_app.ts"), "utf-8")).toContain(
      "organization: organizationRouter",
    );
    expect(schema(root)).toMatch(/model OrganizationInvitation /);
    // Hosts still render the real slot even when ai/billing overrides replaced them.
    expect(
      fs.readFileSync(path.join(root, "apps/web/components/home/AppSidebar.tsx"), "utf-8"),
    ).toContain("<WorkspaceSlot />");
    expect(
      fs.readFileSync(path.join(root, "apps/mobile/app/(home)/settings.tsx"), "utf-8"),
    ).toContain("<OrgSelector />");
    expect(
      fs.readFileSync(path.join(root, "apps/web/components/organizations/WorkspaceSlot.tsx"), "utf-8"),
    ).toContain("WorkspaceSwitcher");
  });
});
