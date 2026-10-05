// Structured release notes: one releases/<version>.json per published starter
// version. Kept free of imports so scripts/publish-template-branch.mjs and
// scripts/release-notes.mjs can load it through Node's type stripping.

export const RELEASE_ENTRY_TYPES = ["feature", "fix", "security", "breaking"] as const;
export type ReleaseEntryType = (typeof RELEASE_ENTRY_TYPES)[number];

export type ReleaseEntry = {
  /** "core", or the scaffold module the change belongs to. */
  module: string;
  type: ReleaseEntryType;
  title: string;
  /** The change ships a database migration. */
  migration?: boolean;
};

export type Release = {
  version: string;
  /** YYYY-MM-DD */
  date: string;
  highlights: string[];
  entries: ReleaseEntry[];
  /** Generated from commits and not yet reviewed: never shown or published. */
  draft?: boolean;
};

const SEMVER = /^(\d+)\.(\d+)\.(\d+)$/;

/** Checks one release file against the format; throws listing every problem. */
export function parseRelease(value: unknown, modules: readonly string[]): Release {
  const problems: string[] = [];
  const release = (value ?? {}) as Record<string, unknown>;
  if (typeof value !== "object" || value === null) problems.push("must be an object");

  if (typeof release.version !== "string" || !SEMVER.test(release.version)) {
    problems.push("version must look like 1.2.3");
  }
  if (typeof release.date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(release.date) || Number.isNaN(Date.parse(release.date))) {
    problems.push("date must be YYYY-MM-DD");
  }
  if (!Array.isArray(release.highlights) || release.highlights.some((item) => typeof item !== "string" || !item.trim())) {
    problems.push("highlights must be a list of sentences");
  }
  if (release.draft !== undefined && typeof release.draft !== "boolean") problems.push("draft must be true or false");

  if (!Array.isArray(release.entries)) {
    problems.push("entries must be a list");
  } else {
    release.entries.forEach((raw, index) => {
      const entry = (raw ?? {}) as Record<string, unknown>;
      const where = `entries[${index}]`;
      if (typeof entry.module !== "string" || (entry.module !== "core" && !modules.includes(entry.module))) {
        problems.push(`${where}.module must be "core" or one of ${modules.join(", ")}`);
      }
      if (!RELEASE_ENTRY_TYPES.includes(entry.type as ReleaseEntryType)) {
        problems.push(`${where}.type must be one of ${RELEASE_ENTRY_TYPES.join(", ")}`);
      }
      if (typeof entry.title !== "string" || !entry.title.trim()) problems.push(`${where}.title is required`);
      if (entry.migration !== undefined && typeof entry.migration !== "boolean") {
        problems.push(`${where}.migration must be true or false`);
      }
    });
  }

  if (problems.length > 0) throw new Error(problems.join("; "));
  return value as Release;
}

/** Orders x.y.z versions. Anything else (a project's "unknown") sorts first. */
export function compareVersions(a: string, b: string): number {
  const parse = (version: string) => SEMVER.exec(version)?.slice(1).map(Number) ?? [-1, -1, -1];
  const [left, right] = [parse(a), parse(b)];
  for (let index = 0; index < 3; index++) {
    if (left[index] !== right[index]) return left[index]! - right[index]!;
  }
  return 0;
}

/** True when an entry concerns a project with these modules. */
export function affects(entry: ReleaseEntry, modules: readonly string[]): boolean {
  return entry.module === "core" || modules.includes(entry.module);
}

/**
 * Releases after `fromVersion` up to `toVersion`, oldest first, with only the
 * entries that concern the given modules.
 */
export function releasesBetween(
  releases: readonly Release[],
  fromVersion: string,
  toVersion: string,
  modules: readonly string[],
): Release[] {
  return releases
    .filter((release) => compareVersions(release.version, fromVersion) > 0 && compareVersions(release.version, toVersion) <= 0)
    .sort((a, b) => compareVersions(a.version, b.version))
    .map((release) => ({ ...release, entries: release.entries.filter((entry) => affects(entry, modules)) }));
}
