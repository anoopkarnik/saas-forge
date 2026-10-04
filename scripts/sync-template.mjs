import { spawnSync } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";

const repoRoot = process.cwd();
const manifestPath = path.join(repoRoot, "template-sync.manifest.json");

if (!fs.existsSync(manifestPath)) {
  throw new Error(`Missing manifest: ${manifestPath}`);
}

const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const templateRoot = path.join(repoRoot, manifest.templateRoot);
const overrideRoot = path.join(repoRoot, manifest.overrideRoot);
const stageRoot = path.join(repoRoot, manifest.stageRoot ?? ".generated/saas-boilerplate");
const includePaths = manifest.include;
const excludePaths = manifest.exclude;
const overridePaths = manifest.templateOverrides;
const checkMode = process.argv.includes("--check");
const maxDiffLines = 60;
const stageMode = process.argv.includes("--stage");

const generatedSegments = new Set([
  ".cache",
  ".next",
  ".pytest_cache",
  ".ruff_cache",
  ".turbo",
  ".venv",
  ".vercel",
  "__pycache__",
  "build",
  "coverage",
  "dist",
  "node_modules",
  "out"
]);

const rmOptions = {
  recursive: true,
  force: true,
  maxRetries: 5,
  retryDelay: 100,
};

function normalize(relPath) {
  return relPath.split(path.sep).join("/");
}

function joinRelative(...parts) {
  return normalize(path.join(...parts));
}

function shouldIgnoreGenerated(relPath) {
  return normalize(relPath)
    .split("/")
    .filter(Boolean)
    .some((segment) => generatedSegments.has(segment));
}

function isExcluded(relPath) {
  const normalized = normalize(relPath);
  return excludePaths.some(
    (excluded) => normalized === excluded || normalized.startsWith(`${excluded}/`)
  );
}

function isForbidden(relPath) {
  return shouldIgnoreGenerated(relPath) || isExcluded(relPath);
}

function ensureParent(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function copyFiltered(srcPath, destPath, relPath) {
  if (relPath && isForbidden(relPath)) {
    return { copied: 0, skipped: 1 };
  }

  const stat = fs.statSync(srcPath);

  if (stat.isDirectory()) {
    fs.mkdirSync(destPath, { recursive: true });

    let copied = 0;
    let skipped = 0;

    for (const entry of fs.readdirSync(srcPath, { withFileTypes: true })) {
      const childRelPath = relPath ? path.join(relPath, entry.name) : entry.name;
      const childSrcPath = path.join(srcPath, entry.name);
      const childDestPath = path.join(destPath, entry.name);
      const result = copyFiltered(childSrcPath, childDestPath, childRelPath);
      copied += result.copied;
      skipped += result.skipped;
    }

    return { copied, skipped };
  }

  ensureParent(destPath);
  fs.copyFileSync(srcPath, destPath);
  return { copied: 1, skipped: 0 };
}

function removeIncludeTargets(destRoot) {
  for (const includePath of includePaths) {
    fs.rmSync(path.join(destRoot, includePath), rmOptions);
  }
}

function removeExcludedTargets(destRoot) {
  for (const excludePath of excludePaths) {
    fs.rmSync(path.join(destRoot, excludePath), rmOptions);
  }
}

function removeForbiddenTargets(destRoot) {
  function walk(currentPath, relPath) {
    if (!fs.existsSync(currentPath)) {
      return;
    }

    const stat = fs.statSync(currentPath);

    if (relPath && isForbidden(relPath)) {
      fs.rmSync(currentPath, rmOptions);
      return;
    }

    if (!stat.isDirectory()) {
      return;
    }

    for (const entry of fs.readdirSync(currentPath, { withFileTypes: true })) {
      const childRelPath = relPath ? joinRelative(relPath, entry.name) : entry.name;
      walk(path.join(currentPath, entry.name), childRelPath);
    }
  }

  walk(destRoot, "");
}

function applySync(destRoot) {
  let copied = 0;
  let skipped = 0;
  let overridden = 0;

  removeIncludeTargets(destRoot);

  for (const includePath of includePaths) {
    const srcPath = path.join(repoRoot, includePath);
    const destPath = path.join(destRoot, includePath);

    if (!fs.existsSync(srcPath)) {
      throw new Error(`Missing include path: ${includePath}`);
    }

    const result = copyFiltered(srcPath, destPath, includePath);
    copied += result.copied;
    skipped += result.skipped;
  }

  removeExcludedTargets(destRoot);
  removeForbiddenTargets(destRoot);

  for (const overridePath of overridePaths) {
    const srcPath = path.join(overrideRoot, overridePath);
    const destPath = path.join(destRoot, overridePath);

    if (!fs.existsSync(srcPath)) {
      throw new Error(`Missing template override: ${overridePath}`);
    }

    copyFiltered(srcPath, destPath, overridePath);
    overridden += 1;
  }

  return { copied, skipped, overridden };
}

function stageTemplate(destRoot) {
  fs.rmSync(destRoot, rmOptions);
  const result = copyFiltered(templateRoot, destRoot, "");
  removeForbiddenTargets(destRoot);
  return result;
}

function listManagedFiles(rootDir) {
  const files = new Map();

  function walk(currentPath, relPath) {
    if (!fs.existsSync(currentPath)) {
      return;
    }

    if (shouldIgnoreGenerated(relPath) || isExcluded(relPath)) {
      return;
    }

    const stat = fs.statSync(currentPath);
    if (stat.isDirectory()) {
      for (const entry of fs.readdirSync(currentPath, { withFileTypes: true })) {
        const childRelPath = relPath ? path.join(relPath, entry.name) : entry.name;
        walk(path.join(currentPath, entry.name), childRelPath);
      }
      return;
    }

    files.set(normalize(relPath), fs.readFileSync(currentPath));
  }

  for (const includePath of includePaths) {
    walk(path.join(rootDir, includePath), includePath);
  }

  // Root-level overrides (CLAUDE.md, README.md, ...) sit outside every include path.
  for (const overridePath of overridePaths) {
    walk(path.join(rootDir, overridePath), overridePath);
  }

  return files;
}

function listFiles(rootDir) {
  const files = [];

  function walk(currentPath, relPath) {
    if (relPath && isForbidden(relPath)) {
      return;
    }

    const stat = fs.statSync(currentPath);
    if (!stat.isDirectory()) {
      files.push(normalize(relPath));
      return;
    }

    for (const entry of fs.readdirSync(currentPath, { withFileTypes: true })) {
      const childRelPath = relPath ? joinRelative(relPath, entry.name) : entry.name;
      walk(path.join(currentPath, entry.name), childRelPath);
    }
  }

  if (fs.existsSync(rootDir)) {
    walk(rootDir, "");
  }

  return files.sort();
}

function isManaged(relPath) {
  return (
    overridePaths.includes(relPath) ||
    includePaths.some((included) => relPath === included || relPath.startsWith(`${included}/`))
  );
}

function sourceOf(relPath) {
  return overridePaths.includes(relPath)
    ? joinRelative(manifest.overrideRoot, relPath)
    : relPath;
}

function unifiedDiff(expectedPath, actualPath, relPath) {
  const result = spawnSync(
    "diff",
    ["-u", "--label", `${sourceOf(relPath)} (source)`, "--label", `${joinRelative(manifest.templateRoot, relPath)} (template)`, expectedPath, actualPath],
    { encoding: "utf8" }
  );

  if (result.status !== 1 || !result.stdout) {
    return null;
  }

  const lines = result.stdout.split("\n");
  return lines.length > maxDiffLines
    ? [...lines.slice(0, maxDiffLines), `... (${lines.length - maxDiffLines} more lines)`].join("\n")
    : result.stdout;
}

function listForbiddenPaths(rootDir) {
  const forbidden = [];

  function walk(currentPath, relPath) {
    if (!fs.existsSync(currentPath)) {
      return;
    }

    if (relPath && isForbidden(relPath)) {
      forbidden.push(normalize(relPath));
      return;
    }

    const stat = fs.statSync(currentPath);
    if (!stat.isDirectory()) {
      return;
    }

    for (const entry of fs.readdirSync(currentPath, { withFileTypes: true })) {
      const childRelPath = relPath ? joinRelative(relPath, entry.name) : entry.name;
      walk(path.join(currentPath, entry.name), childRelPath);
    }
  }

  walk(rootDir, "");
  return forbidden.sort();
}

function compareManagedTrees(expectedRoot, actualRoot) {
  const expectedFiles = listManagedFiles(expectedRoot);
  const actualFiles = listManagedFiles(actualRoot);
  const errors = [];
  const diffs = [];

  for (const expectedPath of expectedFiles.keys()) {
    if (!actualFiles.has(expectedPath)) {
      errors.push(`Missing file: ${expectedPath} (source: ${sourceOf(expectedPath)})`);
    }
  }

  for (const actualPath of actualFiles.keys()) {
    if (!expectedFiles.has(actualPath)) {
      errors.push(`Unexpected file: ${actualPath} (no source; it would be deleted by template:sync)`);
    }
  }

  for (const [filePath, expectedContents] of expectedFiles.entries()) {
    const actualContents = actualFiles.get(filePath);
    if (!actualContents) {
      continue;
    }

    if (!expectedContents.equals(actualContents)) {
      errors.push(`Out-of-sync file: ${filePath} (source: ${sourceOf(filePath)})`);
      const diff = unifiedDiff(path.join(expectedRoot, filePath), path.join(actualRoot, filePath), filePath);
      if (diff) {
        diffs.push(diff);
      }
    }
  }

  // Files outside the manifest are never compared, so they would drift silently.
  for (const filePath of listFiles(actualRoot)) {
    if (!isManaged(filePath)) {
      errors.push(`Unmanaged file: ${filePath} (add it to "include" or "templateOverrides" in template-sync.manifest.json)`);
    }
  }

  for (const filePath of listFiles(overrideRoot)) {
    if (!overridePaths.includes(filePath)) {
      errors.push(`Unregistered override: ${joinRelative(manifest.overrideRoot, filePath)} (add it to "templateOverrides" or delete it)`);
    }
  }

  return { errors, diffs };
}

function writeStepSummary(errors, diffs) {
  if (!process.env.GITHUB_STEP_SUMMARY) {
    return;
  }

  const sections = [
    "## Template sync check failed",
    "",
    `Fix the source file listed for each entry, then run \`pnpm template:sync\` and commit both. Never edit \`${manifest.templateRoot}\` directly.`,
    "",
    ...errors.map((error) => `- ${error}`),
  ];

  if (diffs.length > 0) {
    sections.push("", "<details><summary>Diffs (source → template)</summary>", "", "```diff", ...diffs, "```", "", "</details>");
  }

  fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${sections.join("\n")}\n`);
}

if (checkMode) {
  const expectedRoot = fs.mkdtempSync(path.join(os.tmpdir(), "template-sync-expected-"));

  try {
    applySync(expectedRoot);
    const { errors, diffs } = compareManagedTrees(expectedRoot, templateRoot);
    const forbiddenPaths = listForbiddenPaths(templateRoot);

    for (const forbiddenPath of forbiddenPaths) {
      errors.push(`Forbidden generated or excluded path present: ${forbiddenPath}`);
    }

    if (errors.length > 0) {
      console.error("Template sync check failed:");
      for (const error of errors) {
        console.error(`- ${error}`);
      }
      for (const diff of diffs) {
        console.error(`\n${diff}`);
      }
      console.error(
        `\nFix the source file listed for each entry, then run \`pnpm template:sync\` and commit both. Never edit ${manifest.templateRoot} directly.`
      );
      writeStepSummary(errors, diffs);
      process.exitCode = 1;
    } else {
      console.log(`Template is in sync with ${manifest.templateRoot}.`);
    }
  } finally {
    fs.rmSync(expectedRoot, rmOptions);
  }
} else if (stageMode) {
  const syncResult = applySync(templateRoot);
  const stageResult = stageTemplate(stageRoot);
  console.log(`Template synced to ${manifest.templateRoot}.`);
  console.log(`Copied files: ${syncResult.copied}`);
  console.log(`Skipped entries: ${syncResult.skipped}`);
  console.log(`Applied overrides: ${syncResult.overridden}`);
  console.log(`Staged clean template at ${normalize(path.relative(repoRoot, stageRoot))}.`);
  console.log(`Staged files: ${stageResult.copied}`);
  console.log(`Staged skipped entries: ${stageResult.skipped}`);
} else {
  const result = applySync(templateRoot);
  console.log(`Template synced to ${manifest.templateRoot}.`);
  console.log(`Copied files: ${result.copied}`);
  console.log(`Skipped entries: ${result.skipped}`);
  console.log(`Applied overrides: ${result.overridden}`);
}
