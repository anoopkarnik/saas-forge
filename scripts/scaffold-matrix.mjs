#!/usr/bin/env node
/**
 * Scaffold variant matrix: compiles buyer-facing variants of the staged starter
 * and runs the checks a buyer hits on day one.
 *
 *   node scripts/scaffold-matrix.mjs                 # PR mode: none, each single, each pair, all,
 *                                                    # plus each provider choice (pairwise)
 *   node scripts/scaffold-matrix.mjs --full          # every module subset (nightly)
 *   node scripts/scaffold-matrix.mjs --only ai+billing   # or --only all / --only none
 *   node scripts/scaffold-matrix.mjs --static        # compile + leak checks only, no install
 *   node scripts/scaffold-matrix.mjs --keep          # keep passing variants (for the boot smoke)
 *
 * Run `pnpm template:stage` first. Variants land in .generated/variants/<name>
 * (passing ones are deleted) with a Markdown summary in summary.md.
 * Needs Node >= 23.6 to import the TypeScript compiler module directly.
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import {
  compileScaffoldVariant,
  findScaffoldLeaks,
  loadModuleManifest,
  loadProviderRegistry,
  loadScaffoldRegistry,
  validateSelectedModules,
} from "../apps/web/lib/scaffold-modules.ts";

const repoRoot = process.cwd();
const stageRoot = path.join(repoRoot, ".generated/saas-boilerplate");
const variantsRoot = path.join(repoRoot, ".generated/variants");
const ALL_PLATFORMS = ["web", "desktop", "mobile"];

const args = process.argv.slice(2);
const full = args.includes("--full");
const staticOnly = args.includes("--static");
const keep = args.includes("--keep");
const only = args.includes("--only") ? args[args.indexOf("--only") + 1] : null;

const CHECKS = staticOnly
  ? ["compile", "leaks"]
  : ["compile", "leaks", "install", "generate", "typecheck", "arch"];
// A failure here makes every later check meaningless.
const BLOCKING = new Set(["compile", "install", "generate"]);

// ── Variant selection ──────────────────────────────────────────────────

const registry = loadScaffoldRegistry();

// Unimplemented modules have empty manifests, so they cannot change the output.
const modules = registry.modules
  .filter((module) => module.downloadEnabled !== false && module.implemented !== false)
  .map((module) => module.id);

function assertUnimplementedModulesAreInert() {
  for (const module of registry.modules.filter((entry) => entry.implemented === false)) {
    const manifest = loadModuleManifest(module.id);
    const hasActions = [manifest.selected, manifest.unselected].some(
      (actions) => actions && Object.keys(actions).length > 0,
    );
    if (hasActions) {
      throw new Error(
        `Module "${module.id}" is marked implemented: false but its manifest has actions; ` +
          "mark it implemented so the matrix covers it.",
      );
    }
  }
}

function subsets(ids) {
  return Array.from({ length: 2 ** ids.length }, (_, mask) =>
    ids.filter((_, index) => mask & (1 << index)),
  ).sort((a, b) => a.length - b.length);
}

function isValidCombination(selection) {
  try {
    validateSelectedModules(selection, registry);
    return true;
  } catch {
    return false;
  }
}

function variantName({ modules: selection, platforms, providers = {} }) {
  let name = selection.length ? selection.join("+") : "none";
  if (platforms.length !== ALL_PLATFORMS.length) name += `@${platforms.join("+")}`;
  const chosen = Object.entries(providers).map(([toggle, value]) => `${toggle}=${value}`);
  return chosen.length ? `${name}~${chosen.join(",")}` : name;
}

function planVariants() {
  // Pairwise mode covers every module alone and every pair; with few modules it
  // equals the full sweep, and it stays bounded as the catalogue grows.
  const moduleSets = subsets(modules)
    .filter((selection) => full || selection.length <= 2 || selection.length === modules.length ||
      registry.modules.some((module) =>
        selection.length === module.requires.length + 1 &&
        selection.includes(module.id) &&
        module.requires.every((required) => selection.includes(required))))
    .filter(isValidCombination);

  // Every module set compiles with all platforms so desktop and mobile typecheck;
  // the extremes also run web-only to cover platform pruning.
  const variants = moduleSets.map((selection) => ({ modules: selection, platforms: ALL_PLATFORMS }));
  for (const selection of [[], modules]) {
    variants.push({ modules: selection, platforms: ["web"] });
  }
  // Providers, pairwise: each choice alone inside its module, then all modules
  // with every toggle on its first and on its last choice.
  const toggles = loadProviderRegistry().providers;
  for (const toggle of toggles) {
    for (const value of toggle.values) {
      variants.push({
        modules: toggle.module ? [toggle.module] : [],
        platforms: ALL_PLATFORMS,
        providers: { [toggle.id]: value },
      });
    }
  }
  for (const pick of [(values) => values[0], (values) => values[values.length - 1]]) {
    variants.push({
      modules,
      platforms: ALL_PLATFORMS,
      providers: Object.fromEntries(toggles.map((toggle) => [toggle.id, pick(toggle.values)])),
    });
  }
  const wanted = only === "all" ? variantName({ modules, platforms: ALL_PLATFORMS }) : only;
  return variants
    .map((variant) => ({ ...variant, name: variantName(variant) }))
    .filter((variant) => !only || variant.name === wanted);
}

// ── Checks ─────────────────────────────────────────────────────────────

function run(command, commandArgs, cwd) {
  const result = spawnSync(command, commandArgs, {
    cwd,
    encoding: "utf-8",
    env: { ...process.env, FORCE_COLOR: "0" },
    maxBuffer: 64 * 1024 * 1024,
  });
  return {
    ok: result.status === 0,
    output: `$ ${command} ${commandArgs.join(" ")}\n${result.stdout ?? ""}${result.stderr ?? ""}${result.error ?? ""}`,
  };
}

function runArchCheck(dir) {
  // The starter does not ship dependency-cruiser config; borrow the root's.
  fs.cpSync(path.join(repoRoot, ".dependency-cruiser.cjs"), path.join(dir, ".dependency-cruiser.cjs"));
  fs.cpSync(path.join(repoRoot, "tooling/depcruise"), path.join(dir, "tooling/depcruise"), { recursive: true });
  const depcruise = path.join(repoRoot, "node_modules/.bin/depcruise");
  const roots = ["apps/web", "apps/desktop/src", "packages"].filter((root) => fs.existsSync(path.join(dir, root)));

  const results = [run(depcruise, [...roots, "--config", ".dependency-cruiser.cjs"], dir)];
  if (fs.existsSync(path.join(dir, "apps/mobile"))) {
    results.push(
      run(depcruise, ["apps/mobile", "--config", ".dependency-cruiser.cjs", "--ts-config", "tooling/depcruise/tsconfig.mobile.json"], dir),
    );
  }
  fs.rmSync(path.join(dir, ".dependency-cruiser.cjs"));
  fs.rmSync(path.join(dir, "tooling"), { recursive: true });
  return { ok: results.every((result) => result.ok), output: results.map((result) => result.output).join("\n") };
}

function runCheck(check, variant, dir) {
  switch (check) {
    case "compile":
      try {
        compileScaffoldVariant({
          baseRoot: stageRoot,
          tempDir: dir,
          selectedModules: variant.modules,
          platforms: variant.platforms,
          providers: variant.providers,
          registry,
        });
        return { ok: true, output: "" };
      } catch (error) {
        return { ok: false, output: String(error?.stack ?? error) };
      }
    case "leaks": {
      const leaks = findScaffoldLeaks(dir, variant.modules, registry, variant.providers);
      return { ok: leaks.length === 0, output: leaks.join("\n") };
    }
    case "install":
      // Frozen, like Vercel and CI: the shipped lockfile must match the variant.
      return run("pnpm", ["install", "--prefer-offline", "--frozen-lockfile", "--ignore-scripts"], dir);
    case "generate":
      return run("pnpm", ["generate"], dir);
    case "typecheck":
      return run("pnpm", ["-r", "--no-bail", "--workspace-concurrency=4", "--filter", "!@workspace/backend", "run", "typecheck"], dir);
    case "arch":
      return runArchCheck(dir);
    default:
      throw new Error(`Unknown check ${check}`);
  }
}

// ── Reporting ──────────────────────────────────────────────────────────

const ICON = { pass: "✅", fail: "❌", skip: "⏭️" };

function tail(text, lines = 60) {
  const all = text.trim().split("\n");
  return all.length > lines ? ["…", ...all.slice(-lines)].join("\n") : all.join("\n");
}

function summarize(results) {
  // Installed package count: what a buyer's `pnpm install` pulls (provider pruning shrinks it).
  const columns = staticOnly ? CHECKS : [...CHECKS, "packages"];
  const header = `| Variant | ${columns.join(" | ")} |\n|---|${columns.map(() => "---").join("|")}|`;
  const rows = results.map(({ name, checks, packages }) => {
    const cells = CHECKS.map((check) => ICON[checks[check]?.status ?? "skip"]);
    if (!staticOnly) cells.push(packages ?? "–");
    return `| \`${name}\` | ${cells.join(" | ")} |`;
  });
  const failures = results.flatMap(({ name, checks }) =>
    CHECKS.filter((check) => checks[check]?.status === "fail").map(
      (check) => `### \`${name}\` — ${check}\n\n\`\`\`\n${tail(checks[check].output)}\n\`\`\``,
    ),
  );
  return [`## Scaffold variant matrix (${full ? "full" : "pairwise"})`, "", header, ...rows, "", ...failures].join("\n");
}

// ── Main ───────────────────────────────────────────────────────────────

assertUnimplementedModulesAreInert();

if (!fs.existsSync(stageRoot)) {
  console.error("Staged starter not found. Run `pnpm template:stage` first.");
  process.exit(1);
}

const variants = planVariants();
if (variants.length === 0) {
  console.error(`No variant matches ${only ? `--only ${only}` : "the registry"}.`);
  process.exit(1);
}

// --only replaces just its own folder so variants kept by earlier runs survive.
fs.rmSync(only ? path.join(variantsRoot, only) : variantsRoot, { recursive: true, force: true });
fs.mkdirSync(variantsRoot, { recursive: true });

const results = [];
for (const variant of variants) {
  // With --only, the directory takes the requested name so callers can find it.
  const dir = path.join(variantsRoot, only ?? variant.name);
  fs.mkdirSync(dir, { recursive: true });
  const checks = {};
  let blocked = false;

  console.log(`\n▶ ${variant.name}`);
  for (const check of CHECKS) {
    if (blocked) {
      checks[check] = { status: "skip", output: "" };
      continue;
    }
    const started = Date.now();
    const { ok, output } = runCheck(check, variant, dir);
    checks[check] = { status: ok ? "pass" : "fail", output };
    console.log(`  ${ICON[checks[check].status]} ${check} (${((Date.now() - started) / 1000).toFixed(1)}s)`);
    if (!ok) {
      fs.writeFileSync(path.join(variantsRoot, `${variant.name}.${check}.log`), output);
      if (BLOCKING.has(check)) blocked = true;
    }
  }

  const store = path.join(dir, "node_modules/.pnpm");
  const packages = checks.install?.status === "pass" && fs.existsSync(store) ? fs.readdirSync(store).length : null;
  results.push({ name: variant.name, checks, packages });
  if (!keep && Object.values(checks).every((result) => result.status === "pass")) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

const summary = summarize(results);
fs.writeFileSync(path.join(variantsRoot, "summary.md"), summary + "\n");
if (process.env.GITHUB_STEP_SUMMARY) {
  fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, summary + "\n");
}
console.log(`\n${summary}`);

const failed = results.filter(({ checks }) => Object.values(checks).some((result) => result.status === "fail"));
if (failed.length > 0) {
  console.error(`\n${failed.length}/${results.length} variant(s) failed. Logs: ${path.relative(repoRoot, variantsRoot)}/`);
  process.exit(1);
}
console.log(`\nAll ${results.length} variant(s) passed.`);
