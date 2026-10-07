import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const WORKSPACE_SEARCH_PREFIXES = [".", "..", "../.."] as const;

export type ScaffoldModuleId =
  | "billing"
  | "multi_tenancy"
  | "ai"
  | "ai_agents"
  | "api_keys"
  | "jobs"
  | "notifications"
  | "audit_log";

type RegistryModuleEntry = {
  id: ScaffoldModuleId;
  label: string;
  /** Buyer-facing copy shown next to the price in every client. */
  description: string;
  default: boolean;
  creditsCost: number;
  requires: ScaffoldModuleId[];
  incompatibleWith: ScaffoldModuleId[];
  downloadEnabled?: boolean;
  /**
   * When explicitly false, the module has no scaffold actions yet (empty
   * manifest). It stays selectable so the UI can list it, but it is charged 0
   * credits until real file actions are authored. Defaults to implemented.
   */
  implemented?: boolean;
};

type RegistryShape = {
  baseCreditsCost: number;
  /** Credits charged per tier step when upgrading (e.g. tier-1 -> tier-3 = 2 steps). */
  tierUpgradeCreditsPerStep?: number;
  /** Files buyers may read in the pre-purchase preview. */
  previewSnippets?: string[];
  modules: RegistryModuleEntry[];
};

type ReplaceAction = {
  from: string;
  to: string;
};

type MergeJsonAction = {
  from: string;
  to: string;
};

/**
 * Removes keys from a JSON object section, or values from a JSON array
 * section: `{ dependencies: ["stripe"] }`, `{ globalEnv: ["BACKEND_URL"] }`.
 */
type JsonRemoveAction = {
  file: string;
  keys: Record<string, string[]>;
};

/** One-off text edit for syntax markers cannot express (e.g. a one-line array). */
type TextReplaceAction = {
  file: string;
  find: string;
  replace: string;
};

type ModuleActions = {
  copy?: ReplaceAction[];
  replace?: ReplaceAction[];
  remove?: string[];
  packageJsonMerge?: MergeJsonAction[];
  jsonRemove?: JsonRemoveAction[];
  textReplace?: TextReplaceAction[];
};

type ModuleManifest = {
  id: ScaffoldModuleId;
  selected?: ModuleActions;
  unselected?: ModuleActions;
  /**
   * Strings that must not appear in a variant where this module is unselected.
   * Checked by the scaffold variant matrix (scripts/scaffold-matrix.mjs).
   */
  ownedIdentifiers?: string[];
};

/**
 * A wizard choice between providers (payment gateway, image storage, CMS).
 * Unchosen values that have a scaffold-providers/<id>/<value>/manifest.json are
 * removed from the download, and their `<id>.<value>` marker regions dropped.
 */
type ProviderToggle = {
  id: string;
  label: string;
  /** The public env toggle the wizard sets, e.g. NEXT_PUBLIC_PAYMENT_GATEWAY. */
  env: string;
  /** Only prunes when this module is selected; null for core toggles. */
  module: ScaffoldModuleId | null;
  /** Every valid choice; any other value keeps all providers. */
  values: string[];
};

type ProviderRegistryShape = { providers: ProviderToggle[] };

/** The chosen value per provider toggle. A toggle left out keeps every provider. */
export type ProviderChoices = Record<string, string>;

type ProviderManifest = {
  /** Applied when this is the buyer's explicit choice, e.g. to pin a default. */
  selected?: ModuleActions;
  unselected?: ModuleActions;
  /** Strings that must not appear once this provider is pruned. */
  ownedIdentifiers?: string[];
};

export type ScaffoldPricingOutput = {
  baseCredits: number;
  moduleCredits: Array<{ moduleId: ScaffoldModuleId; credits: number }>;
  totalCredits: number;
};

/** What every client renders: the registry with effective prices, no internals. */
export type ScaffoldCatalog = {
  baseCredits: number;
  tierUpgradeCreditsPerStep: number;
  modules: Array<{
    id: ScaffoldModuleId;
    label: string;
    description: string;
    creditsCost: number;
    /** Selectable by buyers: download-enabled and implemented. */
    available: boolean;
    requires: ScaffoldModuleId[];
    incompatibleWith: ScaffoldModuleId[];
  }>;
  /** Provider toggles whose unchosen values a download leaves out. */
  providers: ProviderToggle[];
};

export class InvalidScaffoldModuleError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidScaffoldModuleError";
  }
}

export function resolveWorkspacePath(relativePath: string) {
  const cwd = process.cwd();

  for (const prefix of WORKSPACE_SEARCH_PREFIXES) {
    const candidate = path.resolve(cwd, prefix, relativePath);
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  return path.resolve(cwd, relativePath);
}

export function loadScaffoldRegistry(): RegistryShape {
  const registryPath = resolveWorkspacePath("scaffold-modules/registry.json");
  return JSON.parse(fs.readFileSync(registryPath, "utf-8")) as RegistryShape;
}

export function loadModuleManifest(moduleId: ScaffoldModuleId): ModuleManifest {
  const manifestPath = resolveWorkspacePath(
    path.join("scaffold-modules", moduleId, "manifest.json"),
  );
  return JSON.parse(fs.readFileSync(manifestPath, "utf-8")) as ModuleManifest;
}

export function loadProviderRegistry(): ProviderRegistryShape {
  const registryPath = resolveWorkspacePath("scaffold-providers/registry.json");
  if (!fs.existsSync(registryPath)) return { providers: [] };
  return JSON.parse(fs.readFileSync(registryPath, "utf-8")) as ProviderRegistryShape;
}

function getProviderRoot(toggleId: string, value: string) {
  return resolveWorkspacePath(path.join("scaffold-providers", toggleId, value));
}

function loadProviderManifest(toggleId: string, value: string): ProviderManifest | null {
  const manifestPath = path.join(getProviderRoot(toggleId, value), "manifest.json");
  if (!fs.existsSync(manifestPath)) return null;
  return JSON.parse(fs.readFileSync(manifestPath, "utf-8")) as ProviderManifest;
}

/**
 * The providers a download keeps: the wizard's toggle values, for toggles whose
 * module is selected. `keepAll` keeps every provider (runtime switching).
 */
export function resolveProviderChoices(
  env: Record<string, unknown>,
  modules: readonly string[],
  { keepAll = false, registry = loadProviderRegistry() }: { keepAll?: boolean; registry?: ProviderRegistryShape } = {},
): ProviderChoices {
  if (keepAll) return {};
  const choices: ProviderChoices = {};
  for (const toggle of registry.providers) {
    if (toggle.module && !modules.includes(toggle.module)) continue;
    const value = env[toggle.env];
    if (typeof value === "string" && toggle.values.includes(value)) choices[toggle.id] = value;
  }
  return choices;
}

/** Each provider value with whether this selection keeps it. */
function providerStates(
  modules: ReadonlySet<string>,
  providers: ProviderChoices,
  registry: ProviderRegistryShape,
) {
  return registry.providers.flatMap((toggle) => {
    const active = !toggle.module || modules.has(toggle.module);
    const chosen = active ? providers[toggle.id] : undefined;
    return toggle.values.map((value) => ({
      toggleId: toggle.id,
      value,
      markerId: `${toggle.id}.${value}`,
      chosen: chosen === value,
      kept: chosen === undefined || chosen === value,
    }));
  });
}

function getModuleRoot(moduleId: ScaffoldModuleId) {
  return path.dirname(
    resolveWorkspacePath(path.join("scaffold-modules", moduleId, "manifest.json")),
  );
}

export function validateSelectedModules(
  requestedModules: string[],
  registry = loadScaffoldRegistry(),
) {
  const availableModules = new Map(
    registry.modules.map((module) => [module.id, module]),
  );
  const selectedModules = [...new Set(requestedModules)] as string[];

  for (const moduleId of selectedModules) {
    const entry = availableModules.get(moduleId as ScaffoldModuleId);
    if (!entry) {
      throw new InvalidScaffoldModuleError(
        `Unknown scaffold module: ${moduleId}`,
      );
    }

    if (entry.downloadEnabled === false) {
      throw new InvalidScaffoldModuleError(
        `Scaffold module "${moduleId}" is not available for download yet`,
      );
    }
  }

  for (const moduleId of selectedModules) {
    const entry = availableModules.get(moduleId as ScaffoldModuleId)!;

    for (const requirement of entry.requires) {
      if (!selectedModules.includes(requirement)) {
        throw new InvalidScaffoldModuleError(
          `Scaffold module "${moduleId}" requires "${requirement}"`,
        );
      }
    }

    for (const incompatible of entry.incompatibleWith) {
      if (selectedModules.includes(incompatible)) {
        throw new InvalidScaffoldModuleError(
          `Scaffold module "${moduleId}" cannot be combined with "${incompatible}"`,
        );
      }
    }
  }

  return selectedModules as ScaffoldModuleId[];
}

export function calculateScaffoldCredits(
  selectedModules: ScaffoldModuleId[],
  registry = loadScaffoldRegistry(),
): ScaffoldPricingOutput {
  const registryMap = new Map(
    registry.modules.map((module) => [module.id, module]),
  );
  const moduleCredits = selectedModules.map((moduleId) => {
    const entry = registryMap.get(moduleId);
    // Not-yet-implemented modules (empty manifests) stay selectable but free
    // until their scaffold actions are authored.
    const credits = entry && entry.implemented === false ? 0 : entry?.creditsCost ?? 0;
    return { moduleId, credits };
  });

  return {
    baseCredits: registry.baseCreditsCost,
    moduleCredits,
    totalCredits:
      registry.baseCreditsCost +
      moduleCredits.reduce((total, entry) => total + entry.credits, 0),
  };
}

export function getScaffoldCatalog(registry = loadScaffoldRegistry()): ScaffoldCatalog {
  const { moduleCredits } = calculateScaffoldCredits(
    registry.modules.map((module) => module.id),
    registry,
  );
  const effectiveCost = new Map(moduleCredits.map((entry) => [entry.moduleId, entry.credits]));

  return {
    baseCredits: registry.baseCreditsCost,
    tierUpgradeCreditsPerStep: getTierUpgradeCreditsPerStep(registry),
    modules: registry.modules.map((module) => ({
      id: module.id,
      label: module.label,
      description: module.description,
      creditsCost: effectiveCost.get(module.id) ?? 0,
      available: module.downloadEnabled !== false && module.implemented !== false,
      requires: module.requires,
      incompatibleWith: module.incompatibleWith,
    })),
    providers: loadProviderRegistry().providers,
  };
}

/**
 * True when a client quoted a total that no longer matches the server price.
 * Clients that send no expectation (older builds) are not rejected.
 */
export function isPriceChanged(expectedTotalCredits: unknown, totalCredits: number) {
  return typeof expectedTotalCredits === "number" && expectedTotalCredits !== totalCredits;
}

/** Sum of module credits only (no base), implemented-aware. Used for upgrade deltas. */
export function calculateModulesCredits(
  selectedModules: ScaffoldModuleId[],
  registry = loadScaffoldRegistry(),
): number {
  return calculateScaffoldCredits(selectedModules, registry).moduleCredits.reduce(
    (total, entry) => total + entry.credits,
    0,
  );
}

/** Credits charged per tier step on an upgrade (tier-1 -> tier-3 = 2 steps). */
export function getTierUpgradeCreditsPerStep(
  registry = loadScaffoldRegistry(),
): number {
  return registry.tierUpgradeCreditsPerStep ?? 0;
}

function ensureParent(filePath: string) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function copyActionFile(tempDir: string, moduleRoot: string, action: ReplaceAction) {
  const sourcePath = path.join(moduleRoot, action.from);
  const destinationPath = path.join(tempDir, action.to);

  ensureParent(destinationPath);
  fs.cpSync(sourcePath, destinationPath, { recursive: true, force: true });
}

function mergePackageJsonIfNeeded(
  tempDir: string,
  moduleRoot: string,
  action: MergeJsonAction,
) {
  const sourcePath = path.join(moduleRoot, action.from);
  const destinationPath = path.join(tempDir, action.to);
  const sourceJson = JSON.parse(fs.readFileSync(sourcePath, "utf-8"));
  const destinationJson = JSON.parse(fs.readFileSync(destinationPath, "utf-8"));

  const merged = {
    ...destinationJson,
    ...sourceJson,
    dependencies: {
      ...(destinationJson.dependencies ?? {}),
      ...(sourceJson.dependencies ?? {}),
    },
    devDependencies: {
      ...(destinationJson.devDependencies ?? {}),
      ...(sourceJson.devDependencies ?? {}),
    },
    scripts: {
      ...(destinationJson.scripts ?? {}),
      ...(sourceJson.scripts ?? {}),
    },
  };

  fs.writeFileSync(destinationPath, JSON.stringify(merged, null, 2) + "\n");
}

function applyModuleActions(
  tempDir: string,
  moduleRoot: string,
  actions: ModuleActions | undefined,
) {
  if (!actions) {
    return;
  }

  for (const removePath of actions.remove ?? []) {
    fs.rmSync(path.join(tempDir, removePath), {
      recursive: true,
      force: true,
    });
  }

  for (const copy of actions.copy ?? []) {
    copyActionFile(tempDir, moduleRoot, copy);
  }

  for (const replace of actions.replace ?? []) {
    copyActionFile(tempDir, moduleRoot, replace);
  }

  for (const merge of actions.packageJsonMerge ?? []) {
    mergePackageJsonIfNeeded(tempDir, moduleRoot, merge);
  }

  for (const action of actions.jsonRemove ?? []) {
    removeJsonKeys(tempDir, action);
  }

  for (const action of actions.textReplace ?? []) {
    replaceTextOnce(tempDir, action);
  }
}

function replaceTextOnce(tempDir: string, action: TextReplaceAction) {
  const filePath = path.join(tempDir, action.file);
  const content = fs.readFileSync(filePath, "utf-8");
  const occurrences = content.split(action.find).length - 1;
  if (occurrences !== 1) {
    throw new InvalidScaffoldModuleError(
      `textReplace: expected exactly one ${JSON.stringify(action.find)} in ${action.file}, found ${occurrences}`,
    );
  }
  fs.writeFileSync(filePath, content.replace(action.find, () => action.replace));
}

/**
 * Throws when a key is already gone: a silent no-op would hide manifest drift.
 */
function removeJsonKeys(tempDir: string, action: JsonRemoveAction) {
  const filePath = path.join(tempDir, action.file);
  const json = JSON.parse(fs.readFileSync(filePath, "utf-8"));

  for (const [section, keys] of Object.entries(action.keys)) {
    for (const key of keys) {
      const target = json[section];
      const present = Array.isArray(target) ? target.includes(key) : !!target && key in target;
      if (!present) {
        throw new InvalidScaffoldModuleError(
          `jsonRemove: "${section}.${key}" not found in ${action.file}`,
        );
      }
      if (Array.isArray(target)) json[section] = target.filter((value: unknown) => value !== key);
      else delete target[key];
    }
  }

  fs.writeFileSync(filePath, JSON.stringify(json, null, 2) + "\n");
}

// Shared files mark module-owned lines with a region in their own comment
// syntax (`//`, `{/* */}`, `#`): a "scaffold:begin" line naming the module id
// (or a provider, `payment_gateway.stripe`), then a matching "scaffold:end"
// line. When the module or provider is not kept the region is dropped; either
// way the marker lines themselves never ship.
const MARKER_PATTERN = /\bscaffold:(begin|end)\s+([a-z0-9_]+(?:\.[a-z0-9_]+)?)\b/;
const MARKER_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".prisma", ".yml", ".yaml", ".md"]);

function isMarkerCandidate(fileName: string) {
  return fileName === ".env.example" || MARKER_EXTENSIONS.has(path.extname(fileName));
}

/** Pure: returns `content` with marker lines removed and unselected regions dropped. */
export function stripScaffoldMarkers(
  content: string,
  selectedModules: ReadonlySet<string>,
  knownModules: ReadonlySet<string>,
  fileLabel = "<input>",
): string {
  const lines = content.split("\n");
  const open: Array<{ id: string; line: number }> = [];
  const kept: string[] = [];

  lines.forEach((line, index) => {
    const match = line.match(MARKER_PATTERN);
    if (!match) {
      if (open.every((region) => selectedModules.has(region.id))) kept.push(line);
      return;
    }

    const [, kind, id] = match as unknown as [string, "begin" | "end", string];
    const where = `${fileLabel}:${index + 1}`;
    if (!knownModules.has(id)) {
      throw new InvalidScaffoldModuleError(`Unknown module or provider "${id}" in scaffold marker at ${where}`);
    }
    if (kind === "begin") {
      open.push({ id, line: index + 1 });
    } else if (open.pop()?.id !== id) {
      throw new InvalidScaffoldModuleError(`Unmatched scaffold:end ${id} at ${where}`);
    }
  });

  if (open.length > 0) {
    const region = open[open.length - 1]!;
    throw new InvalidScaffoldModuleError(
      `Unclosed scaffold:begin ${region.id} at ${fileLabel}:${region.line}`,
    );
  }

  return kept.join("\n");
}

function walkFiles(rootDir: string, visit: (filePath: string) => void) {
  for (const entry of fs.readdirSync(rootDir, { withFileTypes: true })) {
    if (SCAFFOLD_IGNORE_DIRS.has(entry.name)) continue;
    const fullPath = path.join(rootDir, entry.name);
    if (entry.isDirectory()) walkFiles(fullPath, visit);
    else if (entry.isFile()) visit(fullPath);
  }
}

function applyScaffoldMarkers(
  tempDir: string,
  selectedModules: ReadonlySet<string>,
  knownModules: ReadonlySet<string>,
) {
  walkFiles(tempDir, (filePath) => {
    if (!isMarkerCandidate(path.basename(filePath))) return;
    const content = fs.readFileSync(filePath, "utf-8");
    if (!content.includes("scaffold:")) return;

    const stripped = stripScaffoldMarkers(
      content,
      selectedModules,
      knownModules,
      path.relative(tempDir, filePath),
    );
    if (stripped !== content) fs.writeFileSync(filePath, stripped);
  });
}

const LEAK_SCAN_EXTENSIONS = new Set([...MARKER_EXTENSIONS, ".json", ".sql"]);
// Not module code: agent tooling allow-lists, and the lockfile's orphaned package
// entries (only its importers are pruned per variant).
const LEAK_SCAN_SKIP = [".claude/", ".codex/", "pnpm-lock.yaml"];

/**
 * Lists leftovers in a compiled variant: marker lines that survived, and
 * `ownedIdentifiers` of unselected modules. Empty means clean.
 */
export function findScaffoldLeaks(
  variantDir: string,
  selectedModules: ScaffoldModuleId[],
  registry = loadScaffoldRegistry(),
  providers: ProviderChoices = {},
): string[] {
  const selected = new Set(selectedModules);
  const owned = registry.modules
    .filter((module) => !selected.has(module.id))
    .flatMap((module) =>
      (loadModuleManifest(module.id).ownedIdentifiers ?? []).map((identifier) => ({
        moduleId: module.id as string,
        identifier,
      })),
    );
  for (const provider of providerStates(selected, providers, loadProviderRegistry())) {
    if (provider.kept) continue;
    for (const identifier of loadProviderManifest(provider.toggleId, provider.value)?.ownedIdentifiers ?? []) {
      owned.push({ moduleId: provider.markerId, identifier });
    }
  }

  const leaks: string[] = [];
  walkFiles(variantDir, (filePath) => {
    const relativePath = path.relative(variantDir, filePath).split(path.sep).join("/");
    if (LEAK_SCAN_SKIP.some((prefix) => relativePath.startsWith(prefix))) return;
    const fileName = path.basename(filePath);
    if (fileName !== ".env.example" && !LEAK_SCAN_EXTENSIONS.has(path.extname(fileName))) return;

    const content = fs.readFileSync(filePath, "utf-8");
    if (MARKER_PATTERN.test(content)) {
      leaks.push(`${relativePath}: scaffold marker left in output`);
    }
    for (const { moduleId, identifier } of owned) {
      if (content.includes(identifier)) {
        leaks.push(`${relativePath}: "${identifier}" (owned by unselected ${moduleId})`);
      }
    }
  });
  return leaks;
}

const DEPENDENCY_SECTIONS = new Set(["dependencies", "devDependencies", "optionalDependencies"]);

type DependencyManifest = Partial<Record<string, Record<string, string>>>;

/**
 * Frozen installs (CI, Vercel) reject a lockfile whose importers disagree with
 * the workspace's package.json files, and the starter ships the root repo's
 * lockfile. Pure: drops importers whose manifest is gone (`readManifest`
 * returns null) and dependency entries a manifest no longer declares. Orphaned
 * package entries are accepted by pnpm and pruned on the buyer's next install.
 * Edits only the `importers:` block, which pnpm writes with fixed 2-space nesting.
 */
export function pruneLockfileImporters(
  lockfile: string,
  readManifest: (importerDir: string) => DependencyManifest | null,
): string {
  const lines = lockfile.split("\n");
  const start = lines.indexOf("importers:");
  if (start === -1) return lockfile;
  const blockEnd = lines.findIndex((line, index) => index > start && /^\S/.test(line));
  const end = blockEnd === -1 ? lines.length : blockEnd;

  const kept: string[] = [];
  let manifest: DependencyManifest | null = null;
  let skipImporter = false;
  let section: string | null = null;
  let pendingSectionHeader: string | null = null;
  let skipDependency = false;

  for (const line of lines.slice(start + 1, end)) {
    if (line.trim() === "") {
      if (!skipImporter) kept.push(line);
      continue;
    }
    const indent = line.length - line.trimStart().length;
    const key = line.trim().replace(/:.*$/, "").replace(/^(['"])(.*)\1$/, "$2");

    if (indent === 2) {
      manifest = readManifest(key);
      skipImporter = manifest === null;
      section = null;
      pendingSectionHeader = null;
      skipDependency = false;
      if (!skipImporter) kept.push(line);
      continue;
    }
    if (skipImporter) continue;

    if (indent === 4) {
      skipDependency = false;
      section = DEPENDENCY_SECTIONS.has(key) ? key : null;
      // A dependency section is written only once it keeps an entry.
      pendingSectionHeader = section ? line : null;
      if (!section) kept.push(line);
      continue;
    }

    if (section && indent === 6) {
      skipDependency = !(manifest?.[section] && key in manifest[section]!);
      if (skipDependency) continue;
      if (pendingSectionHeader) {
        kept.push(pendingSectionHeader);
        pendingSectionHeader = null;
      }
    } else if (section && skipDependency) {
      continue;
    }
    kept.push(line);
  }

  return [...lines.slice(0, start + 1), ...kept, ...lines.slice(end)].join("\n");
}

function pruneVariantLockfile(tempDir: string) {
  const lockPath = path.join(tempDir, "pnpm-lock.yaml");
  if (!fs.existsSync(lockPath)) return;

  const pruned = pruneLockfileImporters(fs.readFileSync(lockPath, "utf-8"), (importerDir) => {
    const manifestPath = path.join(tempDir, importerDir, "package.json");
    return fs.existsSync(manifestPath)
      ? (JSON.parse(fs.readFileSync(manifestPath, "utf-8")) as DependencyManifest)
      : null;
  });
  fs.writeFileSync(lockPath, pruned);
}

export function prunePlatforms(tempDir: string, platforms: string[]) {
  if (!platforms.includes("mobile")) {
    fs.rmSync(path.join(tempDir, "apps/mobile"), { recursive: true, force: true });
  }

  if (!platforms.includes("desktop")) {
    fs.rmSync(path.join(tempDir, "apps/desktop"), {
      recursive: true,
      force: true,
    });
  }
}

export function createTempScaffoldDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "saas-forge-scaffold-"));
}

const SCAFFOLD_IGNORE_DIRS = new Set([
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

/** A developer's own env file (.env, .env.production…): real secrets, never shipped. */
export function isLocalEnvFile(fileName: string) {
  return /^\.env(\..+)?$/.test(fileName) && fileName !== ".env.example";
}

export function compileScaffoldVariant({
  baseRoot,
  tempDir,
  selectedModules,
  platforms,
  providers = {},
  registry = loadScaffoldRegistry(),
}: {
  baseRoot: string;
  tempDir: string;
  selectedModules: ScaffoldModuleId[];
  platforms: string[];
  /** Chosen providers; an empty object keeps them all. */
  providers?: ProviderChoices;
  registry?: RegistryShape;
}) {
  fs.cpSync(baseRoot, tempDir, {
    recursive: true,
    filter: (src) => !SCAFFOLD_IGNORE_DIRS.has(path.basename(src)) && !isLocalEnvFile(path.basename(src)),
  });

  const selectedModuleSet = new Set(selectedModules);

  for (const registryModule of registry.modules) {
    const manifest = loadModuleManifest(registryModule.id);
    const moduleRoot = getModuleRoot(registryModule.id);

    if (selectedModuleSet.has(registryModule.id)) {
      applyModuleActions(tempDir, moduleRoot, manifest.selected);
    } else {
      applyModuleActions(tempDir, moduleRoot, manifest.unselected);
    }
  }

  // After the modules: a provider only prunes inside a selected module.
  const providerSet = providerStates(selectedModuleSet, providers, loadProviderRegistry());
  for (const provider of providerSet) {
    if (provider.kept && !provider.chosen) continue;
    const manifest = loadProviderManifest(provider.toggleId, provider.value);
    const root = getProviderRoot(provider.toggleId, provider.value);
    applyModuleActions(tempDir, root, provider.chosen ? manifest?.selected : manifest?.unselected);
  }

  prunePlatforms(tempDir, platforms);
  pruneVariantLockfile(tempDir);
  applyScaffoldMarkers(
    tempDir,
    new Set<string>([...selectedModuleSet, ...providerSet.filter((provider) => provider.kept).map((provider) => provider.markerId)]),
    new Set<string>([...registry.modules.map((module) => module.id), ...providerSet.map((provider) => provider.markerId)]),
  );

  return tempDir;
}
