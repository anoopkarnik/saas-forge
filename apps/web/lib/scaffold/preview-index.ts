import fs from "node:fs";
import path from "node:path";
import {
  compileScaffoldVariant,
  createTempScaffoldDir,
  loadScaffoldRegistry,
  type ScaffoldModuleId,
} from "@/lib/scaffold-modules";
import {
  getBuildCacheStore,
  isIgnoredPath,
  templateFingerprint,
  type BuildCacheStore,
} from "@/lib/scaffold/build-cache";
import type { PreviewCategory, PreviewIndex } from "@workspace/ui/lib/scaffold-preview";

/**
 * Preview index for the pre-purchase file tree. Platform-only; excluded from
 * the boilerplate. Built once per starter fingerprint (memory, then the build
 * cache), so the wizard can compose any selection without a build.
 */

const ALL_PLATFORMS = ["web", "desktop", "mobile"];

type Snapshot = {
  files: Map<string, { size: number; lines: number }>;
  envVars: Set<string>;
  models: Set<string>;
};

export function categorize(filePath: string): PreviewCategory {
  if (/^apps\/web\/app\/.*\/route\.tsx?$/.test(filePath)) return "route";
  if (/^apps\/web\/trpc\/routers\/[^/]+Procedures\.ts$/.test(filePath)) return "procedure";
  if (/\/(components|blocks)\/.+\.tsx$/.test(filePath)) return "component";
  return "other";
}

function countLines(buffer: Buffer): number {
  if (buffer.length === 0 || buffer.includes(0)) return 0; // empty or binary
  let lines = 1;
  for (const byte of buffer) if (byte === 10) lines++;
  return buffer[buffer.length - 1] === 10 ? lines - 1 : lines;
}

function snapshot(dir: string): Snapshot {
  const files = new Map<string, { size: number; lines: number }>();
  const walk = (current: string) => {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      const rel = path.relative(dir, full);
      if (isIgnoredPath(rel)) continue;
      if (entry.isDirectory()) walk(full);
      else if (entry.isFile()) {
        const buffer = fs.readFileSync(full);
        files.set(rel.split(path.sep).join("/"), { size: buffer.length, lines: countLines(buffer) });
      }
    }
  };
  walk(dir);

  const envExample = path.join(dir, "apps/web/.env.example");
  const envVars = new Set(
    fs.existsSync(envExample)
      ? [...fs.readFileSync(envExample, "utf-8").matchAll(/^([A-Z_][A-Z0-9_]*)=/gm)].map((match) => match[1]!)
      : [],
  );

  const prismaDir = path.join(dir, "packages/database/prisma");
  const models = new Set<string>();
  if (fs.existsSync(prismaDir)) {
    for (const file of fs.readdirSync(prismaDir).filter((name) => name.endsWith(".prisma"))) {
      for (const match of fs.readFileSync(path.join(prismaDir, file), "utf-8").matchAll(/^model (\w+)/gm)) {
        models.add(match[1]!);
      }
    }
  }
  return { files, envVars, models };
}

function compileSnapshot(scaffoldRoot: string, modules: ScaffoldModuleId[]): Snapshot {
  const tempDir = createTempScaffoldDir();
  try {
    compileScaffoldVariant({ baseRoot: scaffoldRoot, tempDir, selectedModules: modules, platforms: ALL_PLATFORMS });
    return snapshot(tempDir);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

/**
 * Compiles the all-modules variant once, then once per module with that module
 * (and every module requiring it) removed. Whatever disappears is attributed to
 * the module; modules with fewer dependents claim first, so ai_agents owns its
 * files before ai does.
 */
export function buildPreviewIndex(scaffoldRoot: string): PreviewIndex {
  const registry = loadScaffoldRegistry();
  const modules = registry.modules
    .filter((module) => module.implemented !== false && module.downloadEnabled !== false)
    .map((module) => module.id);
  const requires = new Map(registry.modules.map((module) => [module.id, module.requires]));

  const withDependents = (id: ScaffoldModuleId) => {
    const out = new Set([id]);
    let grew = true;
    while (grew) {
      grew = false;
      for (const candidate of modules) {
        if (!out.has(candidate) && requires.get(candidate)!.some((need) => out.has(need))) {
          out.add(candidate);
          grew = true;
        }
      }
    }
    return out;
  };

  const all = compileSnapshot(scaffoldRoot, modules);
  const fileOwner = new Map<string, string>();
  const envOwner = new Map<string, string>();
  const modelOwner = new Map<string, string>();

  const ordered = modules
    .map((id) => ({ id, removed: withDependents(id) }))
    .sort((a, b) => a.removed.size - b.removed.size);
  for (const { id, removed } of ordered) {
    const without = compileSnapshot(scaffoldRoot, modules.filter((module) => !removed.has(module)));
    for (const file of all.files.keys()) {
      if (!without.files.has(file) && !fileOwner.has(file)) fileOwner.set(file, id);
    }
    for (const key of all.envVars) if (!without.envVars.has(key) && !envOwner.has(key)) envOwner.set(key, id);
    for (const model of all.models) if (!without.models.has(model) && !modelOwner.has(model)) modelOwner.set(model, id);
  }

  return {
    fingerprint: templateFingerprint(scaffoldRoot),
    files: [...all.files]
      .map(([filePath, stats]) => ({
        path: filePath,
        ...stats,
        category: categorize(filePath),
        module: fileOwner.get(filePath) ?? null,
      }))
      .sort((a, b) => a.path.localeCompare(b.path)),
    envVars: [...all.envVars].map((key) => ({ key, module: envOwner.get(key) ?? null })),
    models: [...all.models].map((name) => ({ name, module: modelOwner.get(name) ?? null })),
  };
}

const indexes = new Map<string, PreviewIndex>();

/** The index for the deployed starter: memory, then the build cache, then a fresh build. */
export async function getPreviewIndex(
  scaffoldRoot: string,
  store: BuildCacheStore | null = getBuildCacheStore(),
): Promise<PreviewIndex> {
  const fingerprint = templateFingerprint(scaffoldRoot);
  const cached = indexes.get(fingerprint);
  if (cached) return cached;

  const name = `${fingerprint}.preview.json`;
  if (store) {
    try {
      const bytes = await store.get(name);
      if (bytes) {
        const index = JSON.parse(new TextDecoder().decode(bytes)) as PreviewIndex;
        indexes.set(fingerprint, index);
        return index;
      }
    } catch (err) {
      console.warn("[scaffold] preview index read failed; building instead", err);
    }
  }

  const index = buildPreviewIndex(scaffoldRoot);
  indexes.set(fingerprint, index);
  if (store) {
    try {
      await store.put(name, new TextEncoder().encode(JSON.stringify(index)), "application/json");
    } catch (err) {
      console.warn("[scaffold] preview index write failed", err);
    }
  }
  return index;
}
