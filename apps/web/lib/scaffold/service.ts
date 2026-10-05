import fs from "node:fs";
import path from "node:path";
import archiver from "archiver";
import db from "@workspace/database/client";
import {
  calculateModulesCredits,
  calculateScaffoldCredits,
  compileScaffoldVariant,
  createTempScaffoldDir,
  getTierUpgradeCreditsPerStep,
  loadScaffoldRegistry,
  validateSelectedModules,
  type ScaffoldModuleId,
  type ScaffoldPricingOutput,
} from "@/lib/scaffold-modules";
import { tierOrder } from "@/lib/scaffold/project-rules";
import { isSecretEnvKey } from "@/lib/scaffold/secret-keys";
import { getTemplateVersion } from "@/lib/scaffold/template-version";
import { generateSetupGuide } from "@/lib/scaffold/setup-guide";
import {
  BASE_ROOT,
  computeBuildKey,
  getOrBuildBaseArchive,
  templateFingerprint,
} from "@/lib/scaffold/build-cache";
import { appendFilesToZip, renameZipRoot } from "@workspace/ui/lib/zip-append";
import { getPreviewIndex } from "@/lib/scaffold/preview-index";

/**
 * Shared scaffold service: the one builder behind the session route
 * (`/api/scaffold`), the API-key v1 routes and the upgrade kit. Platform-only;
 * excluded from the boilerplate.
 *
 * Builds never contain secrets. Public wizard choices become `.env` files, and
 * a generated `SETUP.md` explains how to obtain each secret. Clients add any
 * secrets the buyer typed to the ZIP on their own device.
 */

export class ScaffoldRootNotFoundError extends Error {
  constructor() {
    super("Scaffold root not found");
    this.name = "ScaffoldRootNotFoundError";
  }
}

export class SecretNotAcceptedError extends Error {
  readonly code = "secret_not_accepted";
  constructor(readonly keys: string[]) {
    super(`Secret values are not accepted: ${keys.join(", ")}`);
    this.name = "SecretNotAcceptedError";
  }
}

/** Throws when any key is a secret; secrets must never reach the server. */
export function assertNoSecrets(envVars: Record<string, string>) {
  const keys = Object.keys(envVars).filter(isSecretEnvKey);
  if (keys.length > 0) throw new SecretNotAcceptedError(keys);
}

export class InsufficientCreditsError extends Error {
  readonly code = "insufficient_credits";
  constructor(message = "Not enough credits") {
    super(message);
    this.name = "InsufficientCreditsError";
  }
}

const scaffoldRoots = process.env.VERCEL
  ? ["templates/saas-boilerplate", ".generated/saas-boilerplate"]
  : [".generated/saas-boilerplate", "templates/saas-boilerplate"];

function getScaffoldRoot(): string {
  const cwd = process.cwd();
  const candidates = scaffoldRoots.flatMap((root) => [
    path.join(cwd, root),
    path.join(cwd, "../../", root),
    path.join(cwd, "../", root),
  ]);
  const found = candidates.find((p) => fs.existsSync(p));
  return found ?? path.join(cwd, "../../", scaffoldRoots[0]!);
}

export { computeBuildHash } from "@/lib/scaffold/project-rules";

export type BuildProjectZipInput = {
  /** Display name (for the setup guide). */
  name: string;
  /** Folder/zip base name (slug-safe). */
  projectName: string;
  modules: ScaffoldModuleId[];
  platforms: string[];
  config: Record<string, unknown>;
  productTypeId?: string | null;
  tierId: string;
  versionId: string;
  /** Public wizard values written into the web, mobile and desktop .env files. Secrets are refused. */
  envVars?: Record<string, string>;
  /** Serve this earlier cached build if it still exists (re-downloads). */
  preferredBuildKey?: string | null;
};

export type BuildProjectZipResult = {
  bytes: Uint8Array<ArrayBuffer>;
  pricing: ScaffoldPricingOutput;
  buildKey: string;
  cacheHit: boolean;
};

/** Rebuilds the wizard's array fields from flat env vars (for SETUP.md). */
export function formValuesFromEnv(envVars: Record<string, string>): Record<string, unknown> {
  const list = (key: string) =>
    envVars[key] ? envVars[key]!.split(",").map((value) => value.trim()) : [];
  const flags: Array<[string, string]> = [
    ["NEXT_PUBLIC_AUTH_EMAIL", "email_verification"],
    ["NEXT_PUBLIC_AUTH_GOOGLE", "google"],
    ["NEXT_PUBLIC_AUTH_GITHUB", "github"],
    ["NEXT_PUBLIC_AUTH_LINKEDIN", "linkedin"],
  ];
  return {
    ...envVars,
    NEXT_PUBLIC_AUTH_PROVIDERS: flags.filter(([key]) => envVars[key] === "true").map(([, id]) => id),
    NEXT_PUBLIC_PLATFORM: list("NEXT_PUBLIC_PLATFORM"),
    NEXT_PUBLIC_SUPPORT_FEATURES: list("NEXT_PUBLIC_SUPPORT_FEATURES"),
    NEXT_PUBLIC_OBSERVABILITY_FEATURES: list("NEXT_PUBLIC_OBSERVABILITY_FEATURES"),
  };
}

/** Fills a .env.example template with values, keeping comments and order. */
function generateEnvContent(envExample: string | undefined, envVars: Record<string, string>): string {
  if (envExample === undefined) {
    return Object.entries(envVars)
      .map(([key, value]) => `${key}=${value}`)
      .join("\n");
  }

  return envExample
    .split("\n")
    .map((line) => {
      const key = line.match(/^([A-Z_][A-Z0-9_]*)=/)?.[1];
      return key && key in envVars ? `${key}=${envVars[key]}` : line;
    })
    .join("\n");
}

/** The web, mobile and desktop .env files, from the variant's .env.example templates. */
function buildEnvFiles(
  envExamples: Record<string, string>,
  envVars: Record<string, string>,
  modules: ScaffoldModuleId[],
  platforms: string[],
): Array<{ path: string; content: string }> {
  const billingSelected = modules.includes("billing");
  const aiSelected = modules.includes("ai");
  const support = envVars.NEXT_PUBLIC_SUPPORT_FEATURES
    ? envVars.NEXT_PUBLIC_SUPPORT_FEATURES.split(",").map((s) => s.trim())
    : [];
  const flag = (key: string) => (envVars[key] === "true" ? "true" : "false");
  const quoted = (value: string) => `"${value}"`;

  const files = [
    { path: "apps/web/.env", content: generateEnvContent(envExamples["apps/web/.env.example"], envVars) },
  ];

  const mobileExample = envExamples["apps/mobile/.env.example"];
  if (platforms.includes("mobile") && mobileExample !== undefined) {
    files.push({
      path: "apps/mobile/.env",
      content: generateEnvContent(mobileExample, {
        EXPO_PUBLIC_API_URL: envVars.NEXT_PUBLIC_URL || "http://localhost:3000",
        EXPO_PUBLIC_APP_URL: "http://localhost:8081",
        EXPO_PUBLIC_AUTH_EMAIL: flag("NEXT_PUBLIC_AUTH_EMAIL"),
        EXPO_PUBLIC_AUTH_GOOGLE: flag("NEXT_PUBLIC_AUTH_GOOGLE"),
        EXPO_PUBLIC_AUTH_GITHUB: flag("NEXT_PUBLIC_AUTH_GITHUB"),
        EXPO_PUBLIC_AUTH_LINKEDIN: flag("NEXT_PUBLIC_AUTH_LINKEDIN"),
        EXPO_PUBLIC_SUPPORT_MAIL: support.includes("support_mail") ? "true" : "false",
        EXPO_PUBLIC_THEME: envVars.NEXT_PUBLIC_THEME || "green",
        EXPO_PUBLIC_THEME_TYPE: envVars.NEXT_PUBLIC_THEME_TYPE || "light",
        EXPO_PUBLIC_PAYMENT_GATEWAY: billingSelected ? envVars.NEXT_PUBLIC_PAYMENT_GATEWAY || "none" : "none",
        EXPO_PUBLIC_CALENDLY_BOOKING_URL: envVars.NEXT_PUBLIC_CALENDLY_BOOKING_URL || '""',
        EXPO_PUBLIC_AI_ENABLED: aiSelected ? envVars.NEXT_PUBLIC_AI_ENABLED || "false" : "false",
      }),
    });
  }

  const desktopExample = envExamples["apps/desktop/.env.example"];
  if (platforms.includes("desktop") && desktopExample !== undefined) {
    files.push({
      path: "apps/desktop/.env",
      content: generateEnvContent(desktopExample, {
        VITE_API_URL: quoted(envVars.NEXT_PUBLIC_URL || "http://localhost:3000"),
        NEXT_PUBLIC_AUTH_FRAMEWORK: quoted(envVars.NEXT_PUBLIC_AUTH_FRAMEWORK || "better-auth"),
        VITE_AUTH_EMAIL: flag("NEXT_PUBLIC_AUTH_EMAIL"),
        VITE_AUTH_GOOGLE: flag("NEXT_PUBLIC_AUTH_GOOGLE"),
        VITE_AUTH_GITHUB: flag("NEXT_PUBLIC_AUTH_GITHUB"),
        VITE_AUTH_LINKEDIN: flag("NEXT_PUBLIC_AUTH_LINKEDIN"),
        VITE_PAYMENT_GATEWAY: quoted(billingSelected ? envVars.NEXT_PUBLIC_PAYMENT_GATEWAY || "none" : "none"),
        VITE_SUPPORT_MAIL: quoted(
          support.includes("support_mail") ? envVars.NEXT_PUBLIC_SUPPORT_MAIL || "" : "",
        ),
        VITE_CALENDLY_BOOKING_URL: quoted(
          support.includes("calendly") ? envVars.NEXT_PUBLIC_CALENDLY_BOOKING_URL || "" : "",
        ),
        VITE_THEME: envVars.NEXT_PUBLIC_THEME || "green",
        VITE_THEME_TYPE: envVars.NEXT_PUBLIC_THEME_TYPE || "light",
        VITE_AI_ENABLED: aiSelected ? envVars.NEXT_PUBLIC_AI_ENABLED || "false" : "false",
      }),
    });
  }

  return files;
}

/**
 * Builds a download: the cached base archive for the selection (built on a
 * miss), renamed to the project and completed with its env files, SETUP.md and
 * .boilerplate-version.
 */
export async function buildProjectZip(
  input: BuildProjectZipInput,
): Promise<BuildProjectZipResult> {
  if (input.envVars) assertNoSecrets(input.envVars);
  const registry = loadScaffoldRegistry();
  const modules = validateSelectedModules(input.modules, registry);
  const pricing = calculateScaffoldCredits(modules, registry);

  const scaffoldRoot = getScaffoldRoot();
  if (!fs.existsSync(scaffoldRoot)) {
    throw new ScaffoldRootNotFoundError();
  }

  const base = await getOrBuildBaseArchive({
    scaffoldRoot,
    modules,
    platforms: input.platforms,
    preferredBuildKey: input.preferredBuildKey,
  });
  const guide = generateSetupGuide({
    name: input.name,
    productTypeId: input.productTypeId,
    tierId: input.tierId,
    versionId: input.versionId,
    modules,
    config: input.config,
  });

  const root = input.projectName;
  const files = [{ name: `${root}/SETUP.md`, content: guide.markdown }];
  const version = getTemplateVersion();
  if (version && version !== "unknown") {
    files.push({ name: `${root}/.boilerplate-version`, content: version + "\n" });
  }
  if (input.envVars) {
    for (const file of buildEnvFiles(base.manifest.envExamples, input.envVars, modules, input.platforms)) {
      files.push({ name: `${root}/${file.path}`, content: file.content });
    }
  }

  return {
    bytes: appendFilesToZip(renameZipRoot(base.bytes, BASE_ROOT, root), files),
    pricing,
    buildKey: base.manifest.buildKey,
    cacheHit: base.cacheHit,
  };
}

export type ChargeScaffoldCreditsInput = {
  userId: string;
  amount: number;
  idempotencyKey?: string | null;
  job: {
    type: "download" | "upgrade";
    source: "web" | "api";
    projectId?: string | null;
    fromModules?: string[];
    toModules: string[];
    fromTierId?: string | null;
    toTierId: string;
    templateVersion: string;
    /** Download builds start as "building"; omitted for upgrades (delivered at once). */
    status?: "building" | "ready";
    buildKey?: string;
    platforms?: string[];
    projectName?: string;
    /** Public wizard values only; secrets never reach the ledger. */
    envVars?: Record<string, string>;
  };
};

export type ChargeScaffoldCreditsResult = {
  charged: number;
  alreadyProcessed: boolean;
  jobId: string;
};

/**
 * Atomically checks balance, records a ScaffoldJob (the idempotency ledger), and
 * increments creditsUsed — in one transaction. A repeated Idempotency-Key returns
 * the prior charge without charging again. Throws {@link InsufficientCreditsError}
 * when the balance is too low.
 */
export async function chargeScaffoldCredits(
  input: ChargeScaffoldCreditsInput,
): Promise<ChargeScaffoldCreditsResult> {
  if (input.idempotencyKey) {
    const existing = await db.scaffoldJob.findUnique({
      where: { idempotencyKey: input.idempotencyKey },
      select: { id: true, creditsSpent: true },
    });
    if (existing) {
      return {
        charged: existing.creditsSpent,
        alreadyProcessed: true,
        jobId: existing.id,
      };
    }
  }

  try {
    return await db.$transaction(async (tx) => {
      const user = await tx.user.findUniqueOrThrow({
        where: { id: input.userId },
        select: { creditsUsed: true, creditsTotal: true },
      });
      if (
        input.amount > 0 &&
        user.creditsTotal - user.creditsUsed < input.amount
      ) {
        throw new InsufficientCreditsError();
      }
      const job = await tx.scaffoldJob.create({
        data: {
          userId: input.userId,
          projectId: input.job.projectId ?? null,
          type: input.job.type,
          source: input.job.source,
          fromModules: input.job.fromModules ?? [],
          toModules: input.job.toModules,
          fromTierId: input.job.fromTierId ?? null,
          toTierId: input.job.toTierId,
          creditsSpent: input.amount,
          templateVersion: input.job.templateVersion,
          idempotencyKey: input.idempotencyKey ?? null,
          status: input.job.status ?? "ready",
          buildKey: input.job.buildKey ?? null,
          platforms: input.job.platforms ?? [],
          projectName: input.job.projectName ?? null,
          envVars: input.job.envVars ?? undefined,
        },
        select: { id: true },
      });
      if (input.amount > 0) {
        await tx.user.update({
          where: { id: input.userId },
          data: { creditsUsed: user.creditsUsed + input.amount },
        });
      }
      return { charged: input.amount, alreadyProcessed: false, jobId: job.id };
    });
  } catch (err) {
    // Concurrent request already created the job for this idempotency key.
    if (
      (err as { code?: string })?.code === "P2002" &&
      input.idempotencyKey
    ) {
      const existing = await db.scaffoldJob.findUnique({
        where: { idempotencyKey: input.idempotencyKey },
        select: { id: true, creditsSpent: true },
      });
      if (existing) {
        return {
          charged: existing.creditsSpent,
          alreadyProcessed: true,
          jobId: existing.id,
        };
      }
    }
    throw err;
  }
}

/** Returns a failed build's credits, exactly once. */
export async function refundScaffoldJob(jobId: string): Promise<boolean> {
  return db.$transaction(async (tx) => {
    const updated = await tx.scaffoldJob.updateMany({
      where: { id: jobId, refundedAt: null },
      data: { status: "failed", refundedAt: new Date() },
    });
    if (updated.count === 0) return false;
    const job = await tx.scaffoldJob.findUniqueOrThrow({
      where: { id: jobId },
      select: { userId: true, creditsSpent: true },
    });
    if (job.creditsSpent > 0) {
      await tx.user.update({
        where: { id: job.userId },
        data: { creditsUsed: { decrement: job.creditsSpent } },
      });
    }
    return true;
  });
}

/** Build key for a selection against the deployed starter. */
export function scaffoldBuildKey(modules: string[], platforms: string[]): string {
  return computeBuildKey({
    templateFingerprint: templateFingerprint(getScaffoldRoot()),
    modules,
    platforms,
  });
}

/** A delivered download job of the user's, for free re-download. */
export async function getOwnedBuild(userId: string, jobId: string) {
  return db.scaffoldJob.findFirst({
    where: { id: jobId, userId, type: "download", status: "ready" },
    select: {
      id: true,
      projectId: true,
      projectName: true,
      toModules: true,
      toTierId: true,
      platforms: true,
      envVars: true,
      buildKey: true,
    },
  });
}

/** Recent download jobs, newest first, for the "My downloads" list. */
export async function listDownloads(userId: string) {
  return db.scaffoldJob.findMany({
    where: { userId, type: "download", buildKey: { not: null } },
    orderBy: { createdAt: "desc" },
    take: 20,
    select: {
      id: true,
      projectName: true,
      toModules: true,
      platforms: true,
      status: true,
      creditsSpent: true,
      refundedAt: true,
      templateVersion: true,
      createdAt: true,
    },
  });
}

/**
 * Builds and caches the most requested selections (no modules and every
 * implemented module, web-only and all platforms) so the first buyers after a
 * deploy are served from cache. Run by an admin after each deploy.
 */
export async function prewarmBuildCache(): Promise<Array<{ modules: string[]; platforms: string[]; cacheHit: boolean }>> {
  const registry = loadScaffoldRegistry();
  const all = registry.modules.filter((module) => module.implemented !== false).map((module) => module.id);
  const scaffoldRoot = getScaffoldRoot();
  const results = [];
  for (const modules of [[], all] as ScaffoldModuleId[][]) {
    for (const platforms of [["web"], ["web", "desktop", "mobile"]]) {
      const base = await getOrBuildBaseArchive({ scaffoldRoot, modules, platforms });
      results.push({ modules, platforms, cacheHit: base.cacheHit });
    }
  }
  return results;
}

/** Pre-purchase preview: the index the wizard composes selections from. */
export function getScaffoldPreviewIndex() {
  return getPreviewIndex(getScaffoldRoot());
}

/** Exact file list and readable snippets of one selection (builds on a cache miss). */
export async function previewScaffoldBuild(modules: string[], platforms: string[]) {
  const base = await getOrBuildBaseArchive({
    scaffoldRoot: getScaffoldRoot(),
    modules: validateSelectedModules(modules),
    platforms,
  });
  return { files: base.manifest.files, snippets: base.manifest.snippets ?? {} };
}

/** True when the user already has a delivered build of this exact selection. */
export async function ownsBuild(userId: string, buildKey: string): Promise<boolean> {
  const job = await db.scaffoldJob.findFirst({
    where: { userId, buildKey, status: "ready" },
    select: { id: true },
  });
  return !!job;
}

export type DownloadScaffoldInput = BuildProjectZipInput & {
  userId: string;
  source: "web" | "api";
  projectId?: string | null;
  idempotencyKey?: string | null;
  /** Free regardless of ownership (e.g. an unchanged saved project). */
  free?: boolean;
};

export type DownloadScaffoldResult = {
  bytes: Uint8Array<ArrayBuffer>;
  charged: number;
  jobId: string;
  cacheHit: boolean;
  /** A retried request with the same idempotency key: charged only once. */
  alreadyProcessed: boolean;
};

/**
 * The one download flow: charge (free when the buyer already owns this build),
 * build from the cache, then mark the job ready, or refund it if the build fails.
 */
export async function downloadScaffold(input: DownloadScaffoldInput): Promise<DownloadScaffoldResult> {
  if (input.envVars) assertNoSecrets(input.envVars);
  const modules = validateSelectedModules(input.modules);
  const pricing = calculateScaffoldCredits(modules);
  const buildKey = scaffoldBuildKey(modules, input.platforms);
  const free = input.free || (await ownsBuild(input.userId, buildKey));

  const charge = await chargeScaffoldCredits({
    userId: input.userId,
    amount: free ? 0 : pricing.totalCredits,
    idempotencyKey: input.idempotencyKey,
    job: {
      type: "download",
      source: input.source,
      projectId: input.projectId ?? null,
      toModules: modules,
      toTierId: input.tierId,
      templateVersion: getTemplateVersion(),
      status: "building",
      buildKey,
      platforms: input.platforms,
      projectName: input.projectName,
      envVars: input.envVars,
    },
  });

  let build: BuildProjectZipResult;
  try {
    build = await buildProjectZip({ ...input, modules });
  } catch (err) {
    await refundScaffoldJob(charge.jobId);
    throw err;
  }

  await db.scaffoldJob.update({ where: { id: charge.jobId }, data: { status: "ready" } });
  return {
    bytes: build.bytes,
    charged: charge.charged,
    jobId: charge.jobId,
    cacheHit: build.cacheHit,
    alreadyProcessed: charge.alreadyProcessed,
  };
}

// ---------------------------------------------------------------------------
// Upgrade kit (Claude Code-driven, local)
// ---------------------------------------------------------------------------

function archiveToStream(archive: archiver.Archiver, cleanup: () => void): ReadableStream {
  return new ReadableStream({
    start(controller) {
      archive.on("data", (chunk: Buffer) => controller.enqueue(chunk));
      archive.on("end", () => {
        controller.close();
        cleanup();
      });
      archive.on("error", (err: Error) => {
        cleanup();
        controller.error(err);
      });
    },
    cancel() {
      archive.abort();
      cleanup();
    },
  });
}

const UPGRADE_IGNORE = new Set([
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
]);

/** Lists file paths (relative) under a compiled variant, skipping build dirs. */
export function listVariantFiles(dir: string): string[] {
  const out: string[] = [];
  const walk = (cur: string, rel: string) => {
    for (const entry of fs.readdirSync(cur, { withFileTypes: true })) {
      if (UPGRADE_IGNORE.has(entry.name)) continue;
      const childRel = rel ? path.join(rel, entry.name) : entry.name;
      const childCur = path.join(cur, entry.name);
      if (entry.isDirectory()) walk(childCur, childRel);
      else out.push(childRel);
    }
  };
  walk(dir, "");
  return out;
}

export type TreeDiff = { added: string[]; modified: string[]; removed: string[] };

/** Diffs two compiled variants: files added/modified in B vs A, plus removed. */
export function diffTrees(dirA: string, dirB: string): TreeDiff {
  const remainingA = new Set(listVariantFiles(dirA));
  const added: string[] = [];
  const modified: string[] = [];
  for (const rel of listVariantFiles(dirB)) {
    if (!remainingA.has(rel)) {
      added.push(rel);
      continue;
    }
    remainingA.delete(rel);
    const a = fs.readFileSync(path.join(dirA, rel));
    const b = fs.readFileSync(path.join(dirB, rel));
    if (!a.equals(b)) modified.push(rel);
  }
  return { added, modified, removed: [...remainingA] };
}

export type UpgradeDelta = {
  addedModules: ScaffoldModuleId[];
  removedModules: ScaffoldModuleId[];
  tierSteps: number;
  deltaCredits: number;
};

export function computeUpgradeDelta(input: {
  fromModules: ScaffoldModuleId[];
  toModules: ScaffoldModuleId[];
  fromTierId: string;
  toTierId: string;
}): UpgradeDelta {
  const registry = loadScaffoldRegistry();
  const owned = new Set(input.fromModules);
  const target = new Set(input.toModules);
  const addedModules = input.toModules.filter((m) => !owned.has(m));
  const removedModules = input.fromModules.filter((m) => !target.has(m));
  const tierSteps = Math.max(
    0,
    tierOrder(input.toTierId) - tierOrder(input.fromTierId),
  );
  const deltaCredits =
    calculateModulesCredits(addedModules, registry) +
    tierSteps * getTierUpgradeCreditsPerStep(registry);
  return { addedModules, removedModules, tierSteps, deltaCredits };
}

export type BuildUpgradeKitInput = {
  name: string;
  projectName: string;
  fromModules: ScaffoldModuleId[];
  toModules: ScaffoldModuleId[];
  fromTierId: string;
  toTierId: string;
  versionId: string;
  platforms: string[];
  config: Record<string, unknown>;
  productTypeId?: string | null;
};

export type BuildUpgradeKitResult = {
  stream: ReadableStream;
  delta: UpgradeDelta;
  cleanup: () => void;
};

/**
 * Builds a Claude Code upgrade kit: a two-build diff of the current vs target
 * variant, staged under `.upgrade/`, plus `UPGRADE_SPEC.json` for the
 * `/upgrade-boilerplate` command to integrate into the user's customized code.
 * Runs on the user's own Claude Code — the platform only generates the kit.
 */
export function buildUpgradeKit(
  input: BuildUpgradeKitInput,
): BuildUpgradeKitResult {
  const registry = loadScaffoldRegistry();
  const fromModules = validateSelectedModules(input.fromModules, registry);
  const toModules = validateSelectedModules(input.toModules, registry);

  const scaffoldRoot = getScaffoldRoot();
  if (!fs.existsSync(scaffoldRoot)) {
    throw new ScaffoldRootNotFoundError();
  }

  const tempA = createTempScaffoldDir();
  const tempB = createTempScaffoldDir();
  let cleaned = false;
  const cleanup = () => {
    if (cleaned) return;
    fs.rmSync(tempA, { recursive: true, force: true });
    fs.rmSync(tempB, { recursive: true, force: true });
    cleaned = true;
  };

  try {
    compileScaffoldVariant({
      baseRoot: scaffoldRoot,
      tempDir: tempA,
      selectedModules: fromModules,
      platforms: input.platforms,
      registry,
    });
    compileScaffoldVariant({
      baseRoot: scaffoldRoot,
      tempDir: tempB,
      selectedModules: toModules,
      platforms: input.platforms,
      registry,
    });

    const diff = diffTrees(tempA, tempB);
    const delta = computeUpgradeDelta({
      fromModules,
      toModules,
      fromTierId: input.fromTierId,
      toTierId: input.toTierId,
    });

    const guide = generateSetupGuide({
      name: input.name,
      productTypeId: input.productTypeId,
      tierId: input.toTierId,
      versionId: input.versionId,
      modules: toModules,
      config: input.config,
    });

    const spec = {
      generatedAt: new Date().toISOString(),
      templateVersion: getTemplateVersion(),
      from: { modules: fromModules, tierId: input.fromTierId },
      to: {
        modules: toModules,
        tierId: input.toTierId,
        versionId: input.versionId,
      },
      addedModules: delta.addedModules,
      removedModules: delta.removedModules,
      tierSteps: delta.tierSteps,
      deltaCredits: delta.deltaCredits,
      changedFiles: diff,
      newEnvKeys: guide.secrets,
    };

    const archive = archiver("zip", { zlib: { level: 9 } });
    for (const rel of [...diff.added, ...diff.modified]) {
      archive.file(path.join(tempB, rel), {
        name: `${input.projectName}/.upgrade/${rel.split(path.sep).join("/")}`,
      });
    }
    archive.append(JSON.stringify(spec, null, 2) + "\n", {
      name: `${input.projectName}/UPGRADE_SPEC.json`,
    });
    archive.append(guide.markdown, { name: `${input.projectName}/SETUP.md` });
    archive.append(renderUpgradeReadme(spec), {
      name: `${input.projectName}/UPGRADE.md`,
    });

    const stream = archiveToStream(archive, cleanup);
    void archive.finalize();

    return { stream, delta, cleanup };
  } catch (err) {
    cleanup();
    throw err;
  }
}

function renderUpgradeReadme(spec: {
  addedModules: string[];
  removedModules: string[];
  tierSteps: number;
  changedFiles: TreeDiff;
  newEnvKeys: string[];
}): string {
  const lines: string[] = [];
  lines.push("# Boilerplate upgrade kit");
  lines.push("");
  lines.push(
    "Apply this upgrade with Claude Code — it integrates the changes into your",
  );
  lines.push("customized project rather than overwriting files:");
  lines.push("");
  lines.push("```");
  lines.push("claude");
  lines.push("> /upgrade-boilerplate");
  lines.push("```");
  lines.push("");
  lines.push(
    "The command reads `UPGRADE_SPEC.json` and the staged files under `.upgrade/`,",
  );
  lines.push(
    "wires new modules into `_app.ts`, Prisma, and `.env.example`, then removes the",
  );
  lines.push("staging files.");
  lines.push("");
  if (spec.addedModules.length)
    lines.push(`- **Added modules:** ${spec.addedModules.join(", ")}`);
  if (spec.removedModules.length)
    lines.push(`- **Removed modules:** ${spec.removedModules.join(", ")}`);
  if (spec.tierSteps > 0) lines.push(`- **Tier bump:** +${spec.tierSteps} step(s)`);
  lines.push(
    `- **Files:** ${spec.changedFiles.added.length} added, ${spec.changedFiles.modified.length} modified, ${spec.changedFiles.removed.length} to remove`,
  );
  if (spec.newEnvKeys.length) lines.push(`- **New env vars:** see SETUP.md`);
  lines.push("");
  return lines.join("\n");
}
