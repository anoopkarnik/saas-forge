#!/usr/bin/env node
// Readies the staged starter for `pnpm template:dev`. Staging wipes it and
// ships only .env.example, so the developer's local env files are copied in.
// Downloads never carry them: compileScaffoldVariant skips local env files.
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const manifest = JSON.parse(fs.readFileSync(path.join(repoRoot, "template-sync.manifest.json"), "utf8"));
const stageRoot = path.join(repoRoot, manifest.stageRoot ?? ".generated/saas-boilerplate");

const ENV_FILES = [
  "apps/web/.env",
  "apps/backend/.env",
  "apps/desktop/.env",
  "apps/mobile/.env",
  "packages/database/.env",
];

for (const file of ENV_FILES) {
  const source = path.join(repoRoot, file);
  const target = path.join(stageRoot, file);
  if (!fs.existsSync(path.dirname(target))) continue;
  if (fs.existsSync(source)) {
    fs.copyFileSync(source, target);
    console.log(`Copied ${file} into the staged starter.`);
  } else {
    console.warn(`Missing ${file}; create it from ${file}.example first.`);
  }
}

// The starter's backend listens on 8000; run it on the port the copied
// BACKEND_URL names so the staged web app reaches it.
const webEnv = path.join(stageRoot, "apps/web/.env");
const backendPackage = path.join(stageRoot, "apps/backend/package.json");
const backendUrl = fs.existsSync(webEnv)
  ? fs.readFileSync(webEnv, "utf8").match(/^BACKEND_URL=["']?([^"'\s]+)/m)?.[1]
  : undefined;
const backendPort = backendUrl ? URL.parse(backendUrl)?.port : undefined;
if (backendPort && fs.existsSync(backendPackage)) {
  const pkg = JSON.parse(fs.readFileSync(backendPackage, "utf8"));
  pkg.scripts.dev = pkg.scripts.dev.replace(/--port \d+/, `--port ${backendPort}`);
  fs.writeFileSync(backendPackage, `${JSON.stringify(pkg, null, 2)}\n`);
  console.log(`Staged backend dev server set to port ${backendPort}.`);
}

// pnpm can restore Electron from a store entry whose postinstall never
// downloaded the binary; install.js fetches it and is a no-op once present.
const electronInstall = path.join(stageRoot, "node_modules/electron/install.js");
if (fs.existsSync(electronInstall)) {
  execFileSync(process.execPath, [electronInstall], { cwd: path.dirname(electronInstall), stdio: "inherit" });
}
