import { createHash } from "node:crypto";
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
import { getTemplateVersion } from "@/lib/scaffold/template-version";
import { generateSetupGuide } from "@/lib/scaffold/setup-guide";

/**
 * Shared scaffold service — used by the API-key/credits v1 routes (and, later,
 * the upgrade kit). Platform-only; excluded from the boilerplate.
 *
 * Unlike the interactive session route (`/api/scaffold`), the programmatic path
 * never injects real secrets: it ships `.env.example` untouched plus a generated
 * `SETUP.md` describing how to obtain each env var.
 */

export class ScaffoldRootNotFoundError extends Error {
  constructor() {
    super("Scaffold root not found");
    this.name = "ScaffoldRootNotFoundError";
  }
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

function shouldIgnore(relPath: string): boolean {
  const parts = relPath.split(path.sep);
  const ignoreDirs = new Set([
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
    "pnpm-lock.yaml",
  ]);
  const ignoreFiles = new Set([".DS_Store", "Thumbs.db"]);
  if (parts.some((p) => ignoreDirs.has(p))) return true;
  if (ignoreFiles.has(path.basename(relPath))) return true;
  if (path.basename(relPath) === ".env") return true;
  return false;
}

/**
 * Stable content hash of the buildable inputs. Must match the hash computed in
 * `projectProcedures.ts` so an unchanged config re-downloads for free.
 */
export function computeBuildHash(project: {
  modules: string[];
  tierId: string;
  versionId: string;
  platforms: string[];
  templateVersion: string;
  config: unknown;
}): string {
  const payload = JSON.stringify({
    modules: [...project.modules].sort(),
    tierId: project.tierId,
    versionId: project.versionId,
    platforms: [...project.platforms].sort(),
    templateVersion: project.templateVersion,
    config: project.config,
  });
  return createHash("sha256").update(payload).digest("hex");
}

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
};

export type BuildProjectZipResult = {
  stream: ReadableStream;
  pricing: ScaffoldPricingOutput;
  cleanup: () => void;
};

export function buildProjectZip(
  input: BuildProjectZipInput,
): BuildProjectZipResult {
  const registry = loadScaffoldRegistry();
  const modules = validateSelectedModules(input.modules, registry);
  const pricing = calculateScaffoldCredits(modules, registry);

  const scaffoldRoot = getScaffoldRoot();
  if (!fs.existsSync(scaffoldRoot)) {
    throw new ScaffoldRootNotFoundError();
  }

  const tempDir = createTempScaffoldDir();
  let cleaned = false;
  const cleanup = () => {
    if (cleaned) return;
    fs.rmSync(tempDir, { recursive: true, force: true });
    cleaned = true;
  };

  try {
    compileScaffoldVariant({
      baseRoot: scaffoldRoot,
      tempDir,
      selectedModules: modules,
      platforms: input.platforms,
      registry,
    });

    const guide = generateSetupGuide({
      name: input.name,
      productTypeId: input.productTypeId,
      tierId: input.tierId,
      versionId: input.versionId,
      modules,
      config: input.config,
    });

    const archive = archiver("zip", { zlib: { level: 9 } });
    archive.directory(tempDir, input.projectName, (entry: any) => {
      const relInsideProject = entry.name.replace(`${input.projectName}/`, "");
      return shouldIgnore(relInsideProject) ? false : entry;
    });
    archive.append(guide.markdown, {
      name: `${input.projectName}/SETUP.md`,
    });
    const version = getTemplateVersion();
    if (version && version !== "unknown") {
      archive.append(version + "\n", {
        name: `${input.projectName}/.boilerplate-version`,
      });
    }

    const stream = new ReadableStream({
      start(controller) {
        archive.on("data", (chunk: any) => controller.enqueue(chunk));
        archive.on("end", () => {
          controller.close();
          cleanup();
        });
        archive.on("error", (err: any) => {
          cleanup();
          controller.error(err);
        });
      },
      cancel() {
        archive.abort();
        cleanup();
      },
    });

    void archive.finalize();

    return { stream, pricing, cleanup };
  } catch (err) {
    cleanup();
    throw err;
  }
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

// ---------------------------------------------------------------------------
// Upgrade kit (Claude Code-driven, local)
// ---------------------------------------------------------------------------

function tierOrder(tierId: string): number {
  const parsed = Number.parseInt(String(tierId).replace(/^tier-/, ""), 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

function archiveToStream(archive: any, cleanup: () => void): ReadableStream {
  return new ReadableStream({
    start(controller) {
      archive.on("data", (chunk: any) => controller.enqueue(chunk));
      archive.on("end", () => {
        controller.close();
        cleanup();
      });
      archive.on("error", (err: any) => {
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
