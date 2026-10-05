#!/usr/bin/env node
// Drafts releases/<version>.json from the conventional commits that changed the
// starter since the last release. A person then edits it (highlights, wording,
// modules), sets "draft": false, and `pnpm template:publish` accepts it.
//
//   pnpm release:notes --version 1.5.0 [--since <git ref>]
//
// Commit → entry: feat → feature, fix/perf → fix, a "security" type or scope →
// security, "!" or "BREAKING CHANGE" → breaking; other types are skipped. The
// module is the scope when it names one, else a module the subject names, else
// the one scaffold-modules/<id>/ the commit touched, else "core". Touching a
// migration sets "migration": true.
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";
import { parseRelease } from "../apps/web/lib/scaffold/release-notes.ts";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const git = (...args) => execFileSync("git", args, { cwd: root, encoding: "utf-8" }).trim();
const STARTER_PATHS = ["templates/", "template-overrides/", "scaffold-modules/"];

/** The newest commit whose manifest says a different version: the last release. */
function previousRelease(version) {
  for (const hash of git("log", "--format=%H", "-G", '"templateVersion"', "--", "template-sync.manifest.json").split("\n")) {
    if (!hash) continue;
    const manifest = JSON.parse(git("show", `${hash}:template-sync.manifest.json`));
    if (manifest.templateVersion !== version) return hash;
  }
  return null;
}

export function entryFromCommit({ subject, body, files }, modules) {
  const match = subject.match(/^(\w+)(?:\(([^)]+)\))?(!)?:\s*(.+)$/);
  if (!match) return null;
  const [, kind, scope = "", bang, text] = match;
  const breaking = !!bang || /BREAKING CHANGE/.test(body);
  const security = kind === "security" || scope === "security";
  const type = breaking ? "breaking" : security ? "security" : { feat: "feature", fix: "fix", perf: "fix" }[kind];
  if (!type) return null;

  const scoped = scope.replace(/-/g, "_");
  const words = `_${text.toLowerCase().replace(/[^a-z0-9]+/g, "_")}_`;
  const named = [...modules].sort((a, b) => b.length - a.length).find((id) => words.includes(`_${id}_`));
  const touched = [...new Set(files.map((file) => file.match(/^scaffold-modules\/([^/]+)\//)?.[1]).filter((id) => modules.includes(id)))];
  return {
    module: modules.includes(scoped) ? scoped : named ?? (touched.length === 1 ? touched[0] : "core"),
    type,
    title: text.replace(/\s*\(#\d+\)$/, ""),
    ...(files.some((file) => file.includes("prisma/migrations/")) ? { migration: true } : {}),
  };
}

function main() {
  const { values } = parseArgs({ options: { version: { type: "string" }, since: { type: "string" } } });
  if (!values.version) {
    console.error("Usage: pnpm release:notes --version <semver> [--since <git ref>]");
    process.exit(1);
  }
  const file = path.join(root, "releases", `${values.version}.json`);
  if (fs.existsSync(file) && JSON.parse(fs.readFileSync(file, "utf-8")).draft !== true) {
    console.error(`releases/${values.version}.json is already reviewed; edit it by hand.`);
    process.exit(1);
  }

  const since = values.since ?? previousRelease(values.version);
  const range = since ? `${since}..HEAD` : "HEAD";
  const modules = JSON.parse(fs.readFileSync(path.join(root, "scaffold-modules/registry.json"), "utf-8")).modules.map(
    (module) => module.id,
  );
  const log = git("log", "--no-merges", "--format=%H%x1f%s%x1f%b%x1e", range, "--", ...STARTER_PATHS);
  const entries = log
    .split("\x1e")
    .map((record) => record.trim())
    .filter(Boolean)
    .map((record) => {
      const [hash, subject, body = ""] = record.split("\x1f");
      const files = git("show", "--name-only", "--format=", hash).split("\n").filter(Boolean);
      return entryFromCommit({ subject, body, files }, modules);
    })
    .filter(Boolean)
    .reverse();

  const release = parseRelease(
    { version: values.version, date: new Date().toISOString().slice(0, 10), highlights: [], entries, draft: true },
    modules,
  );
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(release, null, 2) + "\n");
  console.log(`Drafted releases/${values.version}.json with ${entries.length} entries from ${since ? since.slice(0, 7) : "the first commit"}..HEAD.`);
  console.log('Add highlights, check each module and title, then set "draft": false.');
}

if (process.argv[1] && path.resolve(process.argv[1]) === new URL(import.meta.url).pathname) main();
