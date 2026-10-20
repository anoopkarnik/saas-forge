import { createHmac } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import archiver from "archiver";
import JSZip from "jszip";
import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

/**
 * Per-release starter snapshots, so a kit can diff a project's own release
 * against the latest. Platform-only; excluded from the boilerplate.
 *
 * `pnpm template:publish` uploads one per version: the staged starter (with
 * scaffold markers) and that release's scaffold-modules/ and scaffold-providers/,
 * since an old starter only compiles with its own rules. The deployed starter
 * is always the latest, so it needs no snapshot.
 *
 * Relative imports only: scripts/*.mjs import this file directly.
 */

/** An old release, unpacked: compile `starterRoot` with `rulesRoot`'s manifests. */
export type UpgradeBase = { version: string; starterRoot: string; rulesRoot: string };

export type SnapshotStore = {
  get(version: string): Promise<Uint8Array | null>;
  put(version: string, bytes: Uint8Array): Promise<void>;
};

const VERSION_PATTERN = /^\d+\.\d+\.\d+$/;
const RULE_DIRS = ["scaffold-modules", "scaffold-providers"];
const IGNORED_DIRS = new Set(["node_modules", ".git", ".next", ".turbo", "dist", "build", "out", "coverage", ".vercel", ".cache"]);

export function isReleaseVersion(version: string): boolean {
  return VERSION_PATTERN.test(version);
}

function assertVersion(version: string) {
  if (!isReleaseVersion(version)) throw new Error(`Invalid release version "${version}".`);
}

/** A developer's own env file (.env, .env.production…): real secrets, never stored. */
function isIgnored(relPath: string) {
  const parts = relPath.split(/[\\/]/);
  const name = parts[parts.length - 1]!;
  return parts.some((part) => IGNORED_DIRS.has(part)) || (/^\.env(\..+)?$/.test(name) && name !== ".env.example");
}

/** R2 (the build cache's bucket) when its credentials are set, otherwise null. */
export function getReleaseSnapshotStore(env: NodeJS.ProcessEnv = process.env): SnapshotStore | null {
  const { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME } = env;
  if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET_NAME) return null;

  const client = new S3Client({
    region: "auto",
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY },
  });
  // The bucket may be public (image storage) and a snapshot holds every
  // module's source, so object names are keyed with the secret.
  const key = (version: string) =>
    `release-snapshots/${createHmac("sha256", R2_SECRET_ACCESS_KEY).update(`v${version}`).digest("hex")}.zip`;

  return {
    async get(version) {
      assertVersion(version);
      try {
        const object = await client.send(new GetObjectCommand({ Bucket: R2_BUCKET_NAME, Key: key(version) }));
        return object.Body ? new Uint8Array(await object.Body.transformToByteArray()) : null;
      } catch (err) {
        if ((err as { name?: string })?.name === "NoSuchKey") return null;
        throw err;
      }
    },
    async put(version, bytes) {
      assertVersion(version);
      await client.send(
        new PutObjectCommand({ Bucket: R2_BUCKET_NAME, Key: key(version), Body: bytes, ContentType: "application/zip" }),
      );
    },
  };
}

/** Zips `starter/` (the staged starter) and `rules/scaffold-modules|scaffold-providers/`. */
export async function packReleaseSnapshot(input: { starterRoot: string; rulesRoot: string }): Promise<Uint8Array> {
  const archive = archiver("zip", { zlib: { level: 9 } });
  const chunks: Buffer[] = [];
  archive.on("data", (chunk: Buffer) => chunks.push(chunk));
  const done = new Promise<void>((resolve, reject) => {
    archive.on("end", () => resolve());
    archive.on("error", reject);
  });
  // The filter sees each entry's name before archiver adds the prefix.
  const add = (dir: string, prefix: string) =>
    archive.directory(dir, prefix, (entry: archiver.EntryData) => (isIgnored(entry.name) ? false : entry));
  add(input.starterRoot, "starter");
  for (const name of RULE_DIRS) add(path.join(input.rulesRoot, name), `rules/${name}`);
  await archive.finalize();
  await done;
  return new Uint8Array(Buffer.concat(chunks));
}

export async function unpackReleaseSnapshot(
  bytes: Uint8Array,
  dir: string,
): Promise<{ starterRoot: string; rulesRoot: string }> {
  const zip = await JSZip.loadAsync(bytes);
  const root = path.resolve(dir);
  for (const file of Object.values(zip.files)) {
    if (file.dir) continue;
    const target = path.resolve(root, file.name);
    if (!target.startsWith(root + path.sep)) throw new Error(`Refusing to unpack "${file.name}" outside the snapshot.`);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    const mode = typeof file.unixPermissions === "number" ? file.unixPermissions & 0o777 : 0;
    fs.writeFileSync(target, await file.async("nodebuffer"), mode ? { mode } : undefined);
  }
  return { starterRoot: path.join(root, "starter"), rulesRoot: path.join(root, "rules") };
}

/** Unpacked releases kept per cache root: each is ~60 MB and Vercel's /tmp holds 512 MB. */
const MAX_CACHED = 2;
const CACHED = /^saas-forge-release-\d+\.\d+\.\d+$/;
const STAGING = /^saas-forge-release-\d+\.\d+\.\d+-.+$/;
const inflight = new Map<string, Promise<UpgradeBase | null>>();
const staging = new Set<string>();

/** Drops leftover staging folders and all but the most recently used releases, keeping `keep`. */
function pruneCache(cacheRoot: string, keep: string) {
  const entries = fs.readdirSync(cacheRoot).map((name) => path.join(cacheRoot, name));
  for (const entry of entries) {
    if (STAGING.test(path.basename(entry)) && !staging.has(entry)) fs.rmSync(entry, { recursive: true, force: true });
  }
  const cached = entries
    .filter((entry) => entry !== keep && CACHED.test(path.basename(entry)))
    .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);
  for (const entry of cached.slice(MAX_CACHED - 1)) fs.rmSync(entry, { recursive: true, force: true });
}

/**
 * The release `version`, unpacked under `cacheRoot` (reused while the function
 * instance lives), or null when there is no store or no snapshot for it.
 * Overlapping requests for one version share a download.
 */
export async function loadReleaseSnapshot(
  version: string,
  { store = getReleaseSnapshotStore(), cacheRoot = os.tmpdir() }: { store?: SnapshotStore | null; cacheRoot?: string } = {},
): Promise<UpgradeBase | null> {
  assertVersion(version);
  const dir = path.join(cacheRoot, `saas-forge-release-${version}`);
  const pending = inflight.get(dir);
  if (pending) return pending;
  const load = loadUncached(version, dir, store).finally(() => inflight.delete(dir));
  inflight.set(dir, load);
  return load;
}

async function loadUncached(version: string, dir: string, store: SnapshotStore | null): Promise<UpgradeBase | null> {
  const base = { version, starterRoot: path.join(dir, "starter"), rulesRoot: path.join(dir, "rules") };
  const complete = path.join(dir, ".complete");
  if (fs.existsSync(complete)) {
    const now = new Date();
    fs.utimesSync(dir, now, now); // most recently used survives pruning
    return base;
  }
  if (!store) return null;

  const bytes = await store.get(version);
  if (!bytes) return null;

  pruneCache(path.dirname(dir), dir);
  const stagingDir = fs.mkdtempSync(`${dir}-`);
  staging.add(stagingDir);
  try {
    await unpackReleaseSnapshot(bytes, stagingDir);
    fs.writeFileSync(path.join(stagingDir, ".complete"), "");
    fs.rmSync(dir, { recursive: true, force: true });
    fs.renameSync(stagingDir, dir);
  } catch (err) {
    fs.rmSync(stagingDir, { recursive: true, force: true });
    // A request on another instance sharing this /tmp may have finished it first.
    if (fs.existsSync(complete)) return base;
    throw err;
  } finally {
    staging.delete(stagingDir);
  }
  return base;
}
