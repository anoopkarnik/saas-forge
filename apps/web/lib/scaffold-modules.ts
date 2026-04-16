import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const WORKSPACE_SEARCH_PREFIXES = [".", "..", "../.."] as const;

export type ScaffoldModuleId =
  | "billing"
  | "multi_tenancy"
  | "ai"
  | "api_keys"
  | "notifications";

type RegistryModuleEntry = {
  id: ScaffoldModuleId;
  label: string;
  default: boolean;
  creditsCost: number;
  requires: ScaffoldModuleId[];
  incompatibleWith: ScaffoldModuleId[];
  downloadEnabled?: boolean;
};

type RegistryShape = {
  baseCreditsCost: number;
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

type ModuleActions = {
  copy?: ReplaceAction[];
  replace?: ReplaceAction[];
  remove?: string[];
  packageJsonMerge?: MergeJsonAction[];
};

type ModuleManifest = {
  id: ScaffoldModuleId;
  selected?: ModuleActions;
  unselected?: ModuleActions;
};

export type ScaffoldPricingOutput = {
  baseCredits: number;
  moduleCredits: Array<{ moduleId: ScaffoldModuleId; credits: number }>;
  totalCredits: number;
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

function loadModuleManifest(moduleId: ScaffoldModuleId): ModuleManifest {
  const manifestPath = resolveWorkspacePath(
    path.join("scaffold-modules", moduleId, "manifest.json"),
  );
  return JSON.parse(fs.readFileSync(manifestPath, "utf-8")) as ModuleManifest;
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
  const moduleCredits = selectedModules.map((moduleId) => ({
    moduleId,
    credits: registryMap.get(moduleId)?.creditsCost ?? 0,
  }));

  return {
    baseCredits: registry.baseCreditsCost,
    moduleCredits,
    totalCredits:
      registry.baseCreditsCost +
      moduleCredits.reduce((total, entry) => total + entry.credits, 0),
  };
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
}

/**
 * After module actions, _app.ts may reference router files that were deleted by
 * another module's unselected actions. This function removes those dead imports
 * and their router registrations so the scaffold compiles cleanly.
 */
function cleanDeadRouterImports(tempDir: string) {
  const appRouterPath = path.join(tempDir, "apps/web/trpc/routers/_app.ts");
  if (!fs.existsSync(appRouterPath)) return;

  const content = fs.readFileSync(appRouterPath, "utf-8");
  const lines = content.split("\n");

  // Collect which local procedure files actually exist
  const routersDir = path.dirname(appRouterPath);
  const deadImports = new Set<string>();

  for (const line of lines) {
    const match = line.match(
      /import\s+\{[^}]+\}\s+from\s+['"]\.\/([\w]+)['"]/,
    );
    if (match?.[1]) {
      const importedFile = path.join(routersDir, `${match[1]}.ts`);
      if (!fs.existsSync(importedFile)) {
        deadImports.add(match[1]);
      }
    }
  }

  if (deadImports.size === 0) return;

  const cleaned = lines.filter((line) => {
    for (const dead of deadImports) {
      // Remove the import line
      if (line.match(new RegExp(`from\\s+['"]\\./${dead}['"]`))) return false;
      // Remove the router registration line (e.g. "    billing: billingRouter,")
      if (line.match(new RegExp(`^\\s+\\w+:\\s+\\w+Router`))) {
        // Extract the router variable name from the dead import line in original content
        const importLine = content
          .split("\n")
          .find((l) => l.includes(`./${dead}`));
        if (importLine) {
          const routerMatch = importLine.match(
            /import\s+\{\s*(\w+)\s*\}\s+from/,
          );
          if (routerMatch?.[1] && line.includes(routerMatch[1])) return false;
        }
      }
    }
    return true;
  });

  fs.writeFileSync(appRouterPath, cleaned.join("\n"));
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

export function compileScaffoldVariant({
  baseRoot,
  tempDir,
  selectedModules,
  platforms,
  registry = loadScaffoldRegistry(),
}: {
  baseRoot: string;
  tempDir: string;
  selectedModules: ScaffoldModuleId[];
  platforms: string[];
  registry?: RegistryShape;
}) {
  fs.cpSync(baseRoot, tempDir, {
    recursive: true,
    filter: (src) => !SCAFFOLD_IGNORE_DIRS.has(path.basename(src)),
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

  cleanDeadRouterImports(tempDir);
  prunePlatforms(tempDir, platforms);

  return tempDir;
}
