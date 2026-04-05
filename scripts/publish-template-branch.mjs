import { execFileSync } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";

const BRANCH = "template/saas-boilerplate";
const TAG_PREFIX = "template/v";
const STAGE_ROOT = ".generated/saas-boilerplate";

const repoRoot = process.cwd();
const stageDir = path.join(repoRoot, STAGE_ROOT);

// ── CLI args ───────────────────────────────────────────────────────────

function parseArgs() {
  const args = process.argv.slice(2);
  let version = null;
  let dryRun = false;
  let noPush = false;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--version" && args[i + 1]) {
      version = args[++i];
    } else if (args[i] === "--dry-run") {
      dryRun = true;
    } else if (args[i] === "--no-push") {
      noPush = true;
    }
  }

  if (!version) {
    console.error("Usage: node scripts/publish-template-branch.mjs --version <semver> [--dry-run] [--no-push]");
    process.exit(1);
  }

  return { version, dryRun, noPush };
}

// ── Helpers ────────────────────────────────────────────────────────────

function git(args, opts = {}) {
  const result = execFileSync("git", args, {
    cwd: opts.cwd || repoRoot,
    encoding: "utf-8",
    stdio: opts.stdio || "pipe",
  });
  return typeof result === "string" ? result.trim() : "";
}

function branchExists(branch) {
  try {
    git(["rev-parse", "--verify", branch]);
    return true;
  } catch {
    return false;
  }
}

function tagExists(tag) {
  try {
    git(["rev-parse", "--verify", `refs/tags/${tag}`]);
    return true;
  } catch {
    return false;
  }
}

// Files that must never be published to the template branch (contain secrets)
const SECRET_FILES = new Set([".env", ".env.local", ".env.production"]);

function isSecretFile(filePath) {
  return SECRET_FILES.has(path.basename(filePath));
}

function copyRecursive(src, dest) {
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    fs.mkdirSync(dest, { recursive: true });
    for (const entry of fs.readdirSync(src)) {
      copyRecursive(path.join(src, entry), path.join(dest, entry));
    }
  } else {
    if (isSecretFile(src)) return; // skip secret files
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(src, dest);
  }
}

function removeContents(dir) {
  for (const entry of fs.readdirSync(dir)) {
    if (entry === ".git") continue;
    fs.rmSync(path.join(dir, entry), { recursive: true, force: true });
  }
}

// ── Main ───────────────────────────────────────────────────────────────

const { version, dryRun, noPush } = parseArgs();
const tag = `${TAG_PREFIX}${version}`;
const worktreePath = path.join(os.tmpdir(), `template-publish-${Date.now()}`);

// Validate staged output exists
if (!fs.existsSync(stageDir) || fs.readdirSync(stageDir).length === 0) {
  console.error(`Staged output not found at ${STAGE_ROOT}. Run "pnpm template:stage" first.`);
  process.exit(1);
}

// Check tag does not already exist
if (tagExists(tag)) {
  console.error(`Tag ${tag} already exists. Choose a different version.`);
  process.exit(1);
}

const mainHash = git(["rev-parse", "--short", "HEAD"]);
const commitMessage = `chore: update template to v${version} (from saas-forge@${mainHash})`;

if (dryRun) {
  console.log("Dry run — no changes will be made.");
  console.log(`  Branch: ${BRANCH}`);
  console.log(`  Tag:    ${tag}`);
  console.log(`  Source: ${STAGE_ROOT}`);
  console.log(`  Commit: ${commitMessage}`);
  process.exit(0);
}

try {
  const exists = branchExists(BRANCH);

  if (exists) {
    // Branch exists — create worktree from it
    git(["worktree", "add", worktreePath, BRANCH]);
  } else {
    // Create an orphan branch via a detached worktree
    git(["worktree", "add", "--detach", worktreePath]);
    git(["checkout", "--orphan", BRANCH], { cwd: worktreePath });
    // Remove any files that --detach may have checked out
    git(["rm", "-rf", "."], { cwd: worktreePath });
  }

  // Clear worktree contents (keep .git)
  removeContents(worktreePath);

  // Copy staged template into worktree
  copyRecursive(stageDir, worktreePath);

  // Write .boilerplate-version
  fs.writeFileSync(path.join(worktreePath, ".boilerplate-version"), `${version}\n`);

  // Stage and commit
  git(["add", "-A"], { cwd: worktreePath });

  // Check if there are actual changes to commit
  try {
    git(["diff", "--cached", "--quiet"], { cwd: worktreePath });
    console.log("No changes detected — template branch is already up to date.");
    process.exit(0);
  } catch {
    // diff --cached --quiet exits non-zero when there are staged changes — this is expected
  }

  git(["commit", "-m", commitMessage], { cwd: worktreePath });
  git(["tag", tag], { cwd: worktreePath });

  console.log(`Committed to ${BRANCH}: ${commitMessage}`);
  console.log(`Tagged: ${tag}`);

  if (!noPush) {
    git(["push", "origin", BRANCH]);
    git(["push", "origin", tag]);
    console.log(`Pushed ${BRANCH} and ${tag} to origin.`);
  } else {
    console.log("Skipping push (--no-push).");
  }
} finally {
  // Clean up worktree
  try {
    git(["worktree", "remove", "--force", worktreePath]);
  } catch {
    // Worktree may not exist if we failed early
    fs.rmSync(worktreePath, { recursive: true, force: true });
    try {
      git(["worktree", "prune"]);
    } catch {
      // Best effort
    }
  }
}
