import { createHash, createHmac } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import archiver from "archiver";
import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import {
  compileScaffoldVariant,
  createTempScaffoldDir,
  isLocalEnvFile,
  loadScaffoldRegistry,
  resolveWorkspacePath,
  type ProviderChoices,
  type ScaffoldModuleId,
} from "@/lib/scaffold-modules";

/**
 * Build cache for scaffold downloads. Platform-only; excluded from the boilerplate.
 *
 * The cached artefact is the compiled variant without anything buyer-specific
 * (no .env files, SETUP.md or project name), so one build serves every buyer
 * with the same modules, providers and platforms. Per-download files are
 * appended later.
 */

/**
 * Bump whenever the output of buildBaseArchive or compileScaffoldVariant
 * changes; build-cache.test.ts fails when their sources change without it.
 */
export const BUILDER_VERSION = 9;

/** Neutral top-level folder of a cached archive, renamed per download. */
export const BASE_ROOT = "saas-forge-app";

/** .env.example templates are kept so a cache hit can still write .env files. */
const ENV_EXAMPLES = ["apps/web/.env.example", "apps/mobile/.env.example", "apps/desktop/.env.example"];

const IGNORE_DIRS = new Set([
  "node_modules",
  ".git",
  ".next",
  "dist",
  "build",
  "out",
  ".turbo",
  ".vercel",
  ".cache",
  "coverage",
  "scaffold",
]);
const IGNORE_FILES = new Set([".DS_Store", "Thumbs.db"]);

export function isIgnoredPath(relPath: string): boolean {
  const parts = relPath.split(path.sep);
  const name = path.basename(relPath);
  return parts.some((part) => IGNORE_DIRS.has(part)) || IGNORE_FILES.has(name) || isLocalEnvFile(name);
}

export type BaseManifest = {
  buildKey: string;
  files: Array<{ path: string; size: number }>;
  envExamples: Record<string, string>;
  /** Allow-listed files buyers may read before paying (registry `previewSnippets`). */
  snippets: Record<string, string>;
};

export type BaseArchive = { bytes: Uint8Array<ArrayBuffer>; manifest: BaseManifest };

function hasAgentFiles(manifest: BaseManifest): boolean {
  const paths = manifest.files.map((file) => file.path);
  return paths.includes("AGENTS.md") && paths.some((file) => file.startsWith(".agents/")) && paths.some((file) => file.startsWith(".claude/"));
}

export interface BuildCacheStore {
  get(objectKey: string): Promise<Uint8Array<ArrayBuffer> | null>;
  put(objectKey: string, bytes: Uint8Array, contentType: string): Promise<void>;
}

const fingerprints = new Map<string, string>();

/**
 * Content hash of the starter plus the module and provider manifests and
 * overrides that shape a variant, so edits to any of them never hit a stale build.
 */
export function templateFingerprint(scaffoldRoot: string): string {
  const cached = fingerprints.get(scaffoldRoot);
  if (cached) return cached;

  const hash = createHash("sha256");
  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const full = path.join(dir, entry.name);
      const rel = path.relative(scaffoldRoot, full);
      if (isIgnoredPath(rel)) continue;
      if (entry.isDirectory()) walk(full);
      else if (entry.isFile()) hash.update(rel).update("\0").update(fs.readFileSync(full)).update("\0");
    }
  };
  walk(scaffoldRoot);
  for (const name of ["scaffold-modules", "scaffold-providers"]) {
    const manifestsDir = resolveWorkspacePath(name);
    if (!fs.existsSync(manifestsDir)) continue;
    hash.update(`${name}\0`);
    const walkManifests = (dir: string) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) walkManifests(full);
        else if (entry.isFile()) hash.update(path.relative(manifestsDir, full)).update("\0").update(fs.readFileSync(full)).update("\0");
      }
    };
    walkManifests(manifestsDir);
  }

  const fingerprint = hash.digest("hex");
  fingerprints.set(scaffoldRoot, fingerprint);
  return fingerprint;
}

export function computeBuildKey(input: {
  templateFingerprint: string;
  modules: string[];
  platforms: string[];
  providers?: ProviderChoices;
}): string {
  return createHash("sha256")
    .update(
      JSON.stringify({
        template: input.templateFingerprint,
        modules: [...input.modules].sort(),
        platforms: [...input.platforms].sort(),
        providers: Object.entries(input.providers ?? {}).sort(([a], [b]) => a.localeCompare(b)),
        builder: BUILDER_VERSION,
      }),
    )
    .digest("hex");
}

/** Keyed with the storage secret, so object names cannot be derived even if the bucket is public. */
function objectName(buildKey: string, secret: string): string {
  return createHmac("sha256", secret).update(buildKey).digest("hex");
}

/** R2 store when its credentials are configured, otherwise no cache (every download builds). */
export function getBuildCacheStore(env: NodeJS.ProcessEnv = process.env): BuildCacheStore | null {
  const { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME } = env;
  if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET_NAME) return null;

  const client = new S3Client({
    region: "auto",
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY },
  });
  const key = (name: string) => `scaffold-builds/${objectName(name, R2_SECRET_ACCESS_KEY)}`;

  return {
    async get(name) {
      try {
        const object = await client.send(new GetObjectCommand({ Bucket: R2_BUCKET_NAME, Key: key(name) }));
        return object.Body ? new Uint8Array(await object.Body.transformToByteArray()) : null;
      } catch (err) {
        if ((err as { name?: string })?.name === "NoSuchKey") return null;
        throw err;
      }
    },
    async put(name, bytes, contentType) {
      await client.send(
        new PutObjectCommand({ Bucket: R2_BUCKET_NAME, Key: key(name), Body: bytes, ContentType: contentType }),
      );
    },
  };
}

async function archiveDirectory(dir: string): Promise<Uint8Array<ArrayBuffer>> {
  // The archive is cached, so build time matters more than ratio.
  const archive = archiver("zip", { zlib: { level: 6 } });
  const chunks: Buffer[] = [];
  archive.on("data", (chunk: Buffer) => chunks.push(chunk));
  const done = new Promise<void>((resolve, reject) => {
    archive.on("end", () => resolve());
    archive.on("error", reject);
  });
  archive.directory(dir, BASE_ROOT, (entry: archiver.EntryData) => {
    const rel = entry.name.slice(BASE_ROOT.length + 1);
    return isIgnoredPath(rel) ? false : entry;
  });
  await archive.finalize();
  await done;
  return new Uint8Array(Buffer.concat(chunks));
}

/** Compiles the variant and zips it under BASE_ROOT. */
export async function buildBaseArchive(input: {
  scaffoldRoot: string;
  modules: ScaffoldModuleId[];
  platforms: string[];
  providers?: ProviderChoices;
  buildKey: string;
}): Promise<BaseArchive> {
  const registry = loadScaffoldRegistry();
  const tempDir = createTempScaffoldDir();
  try {
    compileScaffoldVariant({
      baseRoot: input.scaffoldRoot,
      tempDir,
      selectedModules: input.modules,
      platforms: input.platforms,
      providers: input.providers,
      registry,
    });

    const files: BaseManifest["files"] = [];
    const walk = (dir: string) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        const rel = path.relative(tempDir, full);
        if (isIgnoredPath(rel)) continue;
        if (entry.isDirectory()) walk(full);
        else if (entry.isFile()) files.push({ path: rel.split(path.sep).join("/"), size: fs.statSync(full).size });
      }
    };
    walk(tempDir);

    const readAll = (paths: string[]) => {
      const out: Record<string, string> = {};
      for (const rel of paths) {
        const full = path.join(tempDir, rel);
        if (fs.existsSync(full)) out[rel] = fs.readFileSync(full, "utf-8");
      }
      return out;
    };

    return {
      bytes: await archiveDirectory(tempDir),
      manifest: {
        buildKey: input.buildKey,
        files,
        envExamples: readAll(ENV_EXAMPLES),
        snippets: readAll(registry.previewSnippets ?? []),
      },
    };
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

/**
 * Returns the cached base archive for a selection, building and caching it on
 * a miss. Cache failures never fail a download: the build is returned anyway.
 */
export async function getOrBuildBaseArchive(input: {
  scaffoldRoot: string;
  modules: ScaffoldModuleId[];
  platforms: string[];
  /** Chosen providers; empty keeps every provider. */
  providers?: ProviderChoices;
  /** Serve this earlier build if still cached (an owner re-downloading what they bought). */
  preferredBuildKey?: string | null;
  store?: BuildCacheStore | null;
}): Promise<BaseArchive & { cacheHit: boolean }> {
  const store = input.store === undefined ? getBuildCacheStore() : input.store;
  const buildKey = computeBuildKey({
    templateFingerprint: templateFingerprint(input.scaffoldRoot),
    modules: input.modules,
    platforms: input.platforms,
    providers: input.providers,
  });

  if (store) {
    for (const key of new Set([input.preferredBuildKey, buildKey].filter(Boolean) as string[])) {
      try {
        const [bytes, manifestBytes] = await Promise.all([
          store.get(`${key}.zip`),
          store.get(`${key}.manifest.json`),
        ]);
        if (bytes && manifestBytes) {
          const manifest = JSON.parse(new TextDecoder().decode(manifestBytes)) as BaseManifest;
          if (hasAgentFiles(manifest)) return { bytes, manifest, cacheHit: true };
        }
      } catch (err) {
        console.warn("[scaffold] build cache read failed; building instead", err);
      }
    }
  }

  const built = await buildBaseArchive({ ...input, buildKey });
  if (store) {
    try {
      await Promise.all([
        store.put(`${buildKey}.zip`, built.bytes, "application/zip"),
        store.put(`${buildKey}.manifest.json`, new TextEncoder().encode(JSON.stringify(built.manifest)), "application/json"),
      ]);
    } catch (err) {
      console.warn("[scaffold] build cache write failed", err);
    }
  }
  return { ...built, cacheHit: false };
}
