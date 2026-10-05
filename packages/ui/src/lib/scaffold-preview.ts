/**
 * Pre-purchase preview of a scaffold download, composed in the browser from
 * the server's preview index (`scaffold.previewIndex`): instant totals and
 * diffs while a buyer toggles modules, with no build. Root-only.
 */

export type PreviewCategory = "route" | "procedure" | "component" | "other";

export type PreviewFile = {
  path: string;
  size: number;
  lines: number;
  category: PreviewCategory;
  /** The module that adds this file, or null for the base starter. */
  module: string | null;
};

export type PreviewIndex = {
  fingerprint: string;
  /** Every file of the all-modules, all-platforms download. */
  files: PreviewFile[];
  /** Env vars in apps/web/.env.example, with the module that adds each. */
  envVars: Array<{ key: string; module: string | null }>;
  /** Prisma models, with the module that adds each. */
  models: Array<{ name: string; module: string | null }>;
};

export type PreviewTotals = {
  files: number;
  lines: number;
  routes: number;
  procedures: number;
  components: number;
  models: number;
  envVars: number;
};

/** Platform folders pruned when the platform is not selected. */
const PLATFORM_ROOTS: Record<string, string> = { mobile: "apps/mobile/", desktop: "apps/desktop/" };

function included(module: string | null, path: string | null, modules: string[], platforms: string[]): boolean {
  if (module !== null && !modules.includes(module)) return false;
  if (path === null) return true;
  return Object.entries(PLATFORM_ROOTS).every(
    ([platform, root]) => platforms.includes(platform) || !path.startsWith(root),
  );
}

export function composePreview(
  index: PreviewIndex,
  modules: string[],
  platforms: string[],
): { files: PreviewFile[]; envVars: string[]; models: string[]; totals: PreviewTotals } {
  const files = index.files.filter((file) => included(file.module, file.path, modules, platforms));
  const envVars = index.envVars.filter((env) => included(env.module, null, modules, platforms)).map((env) => env.key);
  const models = index.models.filter((model) => included(model.module, null, modules, platforms)).map((model) => model.name);
  const count = (category: PreviewCategory) => files.filter((file) => file.category === category).length;
  return {
    files,
    envVars,
    models,
    totals: {
      files: files.length,
      lines: files.reduce((sum, file) => sum + file.lines, 0),
      routes: count("route"),
      procedures: count("procedure"),
      components: count("component"),
      models: models.length,
      envVars: envVars.length,
    },
  };
}

/** What changes between two selections: paths added and removed. */
export function diffPreview(
  index: PreviewIndex,
  before: { modules: string[]; platforms: string[] },
  after: { modules: string[]; platforms: string[] },
): { added: PreviewFile[]; removed: PreviewFile[] } {
  const was = new Set(composePreview(index, before.modules, before.platforms).files.map((file) => file.path));
  const now = composePreview(index, after.modules, after.platforms).files;
  const nowPaths = new Set(now.map((file) => file.path));
  return {
    added: now.filter((file) => !was.has(file.path)),
    removed: index.files.filter((file) => was.has(file.path) && !nowPaths.has(file.path)),
  };
}
