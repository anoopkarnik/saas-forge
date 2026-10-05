import fs from "node:fs";
import path from "node:path";
import { logger } from "@workspace/observability/winston-logger";
import { loadScaffoldRegistry, resolveWorkspacePath } from "@/lib/scaffold-modules";
import {
  compareVersions,
  parseRelease,
  releasesBetween,
  type Release,
  type ReleaseEntry,
} from "@/lib/scaffold/release-notes";

/**
 * Release notes for the Upgrade Center, read from releases/*.json at the repo
 * root (published by `pnpm template:publish`). Platform-only.
 */

let cached: Release[] | null = null;

/** Published (non-draft) releases, oldest first. An invalid file is skipped and logged. */
export function loadReleases(dir = resolveWorkspacePath("releases")): Release[] {
  const isDefault = dir === resolveWorkspacePath("releases");
  if (isDefault && cached) return cached;

  const modules = loadScaffoldRegistry().modules.map((module) => module.id);
  const releases: Release[] = [];
  for (const file of fs.existsSync(dir) ? fs.readdirSync(dir) : []) {
    if (!file.endsWith(".json")) continue;
    try {
      const release = parseRelease(JSON.parse(fs.readFileSync(path.join(dir, file), "utf-8")), modules);
      if (!release.draft) releases.push(release);
    } catch (error) {
      logger.warn("Skipping invalid release notes", { file, error: (error as Error).message });
    }
  }
  releases.sort((a, b) => compareVersions(a.version, b.version));
  if (isDefault) cached = releases;
  return releases;
}

export type SecurityAdvisory = ReleaseEntry & { version: string };

export type ProjectReleases = {
  currentVersion: string;
  latestVersion: string;
  /** Published releases since the project's version. */
  behind: number;
  /** Those releases, with only the entries for the project's modules. */
  releases: Release[];
  /** Security fixes in them that concern the project: shown to every owner. */
  advisories: SecurityAdvisory[];
};

/** `latestVersion` is the deployed starter's (getTemplateVersion()). */
export function getProjectReleases(
  project: { templateVersion: string; modules: string[] },
  releases: readonly Release[],
  latestVersion: string,
): ProjectReleases {
  const since = releasesBetween(releases, project.templateVersion, latestVersion, project.modules);
  return {
    currentVersion: project.templateVersion,
    latestVersion,
    behind: since.length,
    releases: since,
    advisories: since.flatMap((release) =>
      release.entries.filter((entry) => entry.type === "security").map((entry) => ({ ...entry, version: release.version })),
    ),
  };
}
