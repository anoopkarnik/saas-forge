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
const stageMode = process.argv.includes("--stage");

const generatedSegments = new Set([
  ".cache",
  ".next",
  ".turbo",
  ".vercel",
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

  return files;
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

  for (const expectedPath of expectedFiles.keys()) {
    if (!actualFiles.has(expectedPath)) {
      errors.push(`Missing file: ${expectedPath}`);
    }
  }

  for (const actualPath of actualFiles.keys()) {
    if (!expectedFiles.has(actualPath)) {
      errors.push(`Unexpected file: ${actualPath}`);
    }
  }

  for (const [filePath, expectedContents] of expectedFiles.entries()) {
    const actualContents = actualFiles.get(filePath);
    if (!actualContents) {
      continue;
    }

    if (!expectedContents.equals(actualContents)) {
      errors.push(`Out-of-sync file: ${filePath}`);
    }
  }

  return errors;
}

if (checkMode) {
  const expectedRoot = fs.mkdtempSync(path.join(os.tmpdir(), "template-sync-expected-"));

  try {
    applySync(expectedRoot);
    const errors = compareManagedTrees(expectedRoot, templateRoot);
    const forbiddenPaths = listForbiddenPaths(templateRoot);

    for (const forbiddenPath of forbiddenPaths) {
      errors.push(`Forbidden generated or excluded path present: ${forbiddenPath}`);
    }

    if (errors.length > 0) {
      console.error("Template sync check failed:");
      for (const error of errors) {
        console.error(`- ${error}`);
      }
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
