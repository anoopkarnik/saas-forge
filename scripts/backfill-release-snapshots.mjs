import { execFileSync } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";
import {
  compileScaffoldVariant,
  createTempScaffoldDir,
  loadScaffoldRegistry,
} from "../apps/web/lib/scaffold-modules.ts";
import { packReleaseSnapshot } from "../apps/web/lib/scaffold/release-snapshots.ts";
import { releaseSnapshotStore } from "./release-snapshot-store.mjs";

// Uploads release snapshots for versions published before `pnpm template:publish`
// did it. Each version names the saas-forge commit its template was staged from;
// the "(from saas-forge@<sha>)" in template commit titles is not reliable, since
// a publish can run on uncommitted changes. Before uploading, the snapshot's
// all-modules variant must equal the `template/v<version>` tag, as published.
//
//   node scripts/backfill-release-snapshots.mjs 2.1.1=6184ed2 [more…] [--dry-run]

const repoRoot = process.cwd();
const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const pairs = args.filter((arg) => !arg.startsWith("--")).map((arg) => arg.split("="));
if (pairs.length === 0 || pairs.some(([version, commit]) => !/^\d+\.\d+\.\d+$/.test(version ?? "") || !commit)) {
  console.error("Usage: node scripts/backfill-release-snapshots.mjs <version>=<commit> [...] [--dry-run]");
  process.exit(1);
}

const git = (gitArgs, cwd = repoRoot) => execFileSync("git", gitArgs, { cwd, encoding: "utf-8", stdio: "pipe" }).trim();

const store = dryRun ? null : releaseSnapshotStore(repoRoot);
if (!dryRun && !store) {
  console.error("No R2 credentials in the shell or apps/web/.env.");
  process.exit(1);
}

function listFiles(dir, rel = "") {
  return fs.readdirSync(path.join(dir, rel), { withFileTypes: true }).flatMap((entry) => {
    const child = rel ? path.join(rel, entry.name) : entry.name;
    return entry.isDirectory() ? listFiles(dir, child) : [child];
  });
}

/** Paths that differ between two trees (missing on either side, or other bytes). */
function treeDifferences(a, b) {
  const filesA = new Set(listFiles(a));
  const filesB = new Set(listFiles(b));
  const differences = [];
  for (const file of new Set([...filesA, ...filesB])) {
    if (!filesA.has(file) || !filesB.has(file)) differences.push(`${filesA.has(file) ? "only in snapshot" : "only in tag"}: ${file}`);
    else if (!fs.readFileSync(path.join(a, file)).equals(fs.readFileSync(path.join(b, file)))) differences.push(`differs: ${file}`);
  }
  return differences.sort();
}

let failed = false;
for (const [version, commit] of pairs) {
  const worktree = path.join(os.tmpdir(), `release-snapshot-${version}-${Date.now()}`);
  const published = fs.mkdtempSync(path.join(os.tmpdir(), `release-tag-${version}-`));
  const variant = createTempScaffoldDir();
  try {
    git(["worktree", "add", "--detach", worktree, commit]);
    const manifest = JSON.parse(fs.readFileSync(path.join(worktree, "template-sync.manifest.json"), "utf-8"));
    if (manifest.templateVersion !== version) {
      throw new Error(`${commit} is version ${manifest.templateVersion}, not ${version}.`);
    }
    execFileSync("node", ["scripts/sync-template.mjs", "--stage"], { cwd: worktree, stdio: "pipe" });
    const starterRoot = path.join(worktree, manifest.stageRoot ?? ".generated/saas-boilerplate");

    // The published tag is the all-modules variant (see publish-template-branch.mjs).
    compileScaffoldVariant({
      baseRoot: starterRoot,
      tempDir: variant,
      selectedModules: loadScaffoldRegistry(worktree).modules.map((module) => module.id),
      platforms: ["web", "desktop", "mobile"],
      rulesRoot: worktree,
    });
    execFileSync("sh", ["-c", `git archive "template/v${version}" | tar -x -C "${published}"`], { cwd: repoRoot });
    fs.rmSync(path.join(published, ".boilerplate-version"), { force: true });
    const differences = treeDifferences(variant, published);
    if (differences.length > 0) {
      console.error(`v${version} from ${commit} does not match template/v${version} (${differences.length} paths):`);
      for (const line of differences.slice(0, 20)) console.error(`  ${line}`);
      failed = true;
      continue;
    }

    const snapshot = await packReleaseSnapshot({ starterRoot, rulesRoot: worktree });
    if (dryRun) {
      console.log(`v${version} from ${commit} matches its tag; snapshot ${(snapshot.length / 1024 / 1024).toFixed(1)} MB (dry run, not uploaded).`);
    } else {
      await store.put(version, snapshot);
      console.log(`Uploaded the v${version} snapshot from ${commit} (${(snapshot.length / 1024 / 1024).toFixed(1)} MB).`);
    }
  } catch (error) {
    console.error(`v${version}: ${error.message}`);
    failed = true;
  } finally {
    fs.rmSync(variant, { recursive: true, force: true });
    fs.rmSync(published, { recursive: true, force: true });
    try {
      git(["worktree", "remove", "--force", worktree]);
    } catch {
      fs.rmSync(worktree, { recursive: true, force: true });
      git(["worktree", "prune"]);
    }
  }
}
process.exit(failed ? 1 : 0);
