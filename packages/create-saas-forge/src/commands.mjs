import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { createClient } from "./api.mjs";
import { resolveConfig, saveCredentials } from "./config.mjs";
import { quoteDownload, quoteUpgrade, withRequirements } from "./pricing.mjs";
import { extractZip } from "./zip.mjs";

const MARKER = ".saas-forge.json";
const TEMPLATE_REMOTE = "https://github.com/anoopkarnik/saas-forge.git";
const list = (value) => (value ? String(value).split(",").map((item) => item.trim()).filter(Boolean) : []);

function requireClient(flags, io) {
  const config = resolveConfig(flags, io.env);
  if (!config.apiKey) {
    throw new Error("No API key. Run `create-saas-forge login`, or set SAAS_FORGE_API_KEY.");
  }
  return { config, client: io.createClient ? io.createClient(config) : createClient(config) };
}

async function confirm(io, flags, question) {
  if (flags.yes) return true;
  if (!io.interactive) throw new Error("Add --yes to confirm in non-interactive mode.");
  return /^y(es)?$/i.test((await io.ask(`${question} [y/N] `)).trim());
}

/** Interactive module and platform choice, from the server's catalog. */
async function chooseSelection(io, pricing) {
  const available = pricing.modules.filter((module) => module.available);
  io.log("Modules:");
  available.forEach((module, i) => io.log(`  ${i + 1}. ${module.label} (+${module.creditsCost} credits)`));
  const picked = list(await io.ask("Module numbers, comma-separated (empty for none): "))
    .map((n) => available[Number(n) - 1]?.id)
    .filter(Boolean);
  const platforms = ["web", ...list(await io.ask("Extra platforms (mobile, desktop; empty for web only): "))];
  return { modules: picked, platforms };
}

export async function runNew(dir, flags, io) {
  const target = path.resolve(io.cwd, dir || "my-saas-app");
  if (fs.existsSync(target) && fs.readdirSync(target).length > 0) {
    throw new Error(`${target} already exists and is not empty.`);
  }
  const { config, client } = requireClient(flags, io);
  const pricing = await client.pricing();

  let slug = flags.project;
  let modules;
  if (slug) {
    modules = (await client.getProject(slug)).project.modules;
  } else {
    const selection =
      flags.modules !== undefined || flags.platforms !== undefined || !io.interactive
        ? { modules: list(flags.modules), platforms: list(flags.platforms || "web") }
        : await chooseSelection(io, pricing);
    modules = withRequirements(pricing, selection.modules);
    const { project } = await client.createProject({
      name: flags.name || path.basename(target),
      modules,
      platforms: selection.platforms,
    });
    slug = project.slug;
  }

  const total = quoteDownload(pricing, modules);
  const { credits } = await client.credits();
  io.log(`Project "${slug}" with ${modules.join(", ") || "no extra modules"}: up to ${total} credits (you have ${credits.remaining}).`);
  if (!(await confirm(io, flags, "Download now?"))) return { cancelled: true };

  const { bytes, charged } = await client.download(slug, total).catch((err) => {
    if (err.code === "insufficient_credits") {
      throw new Error(`Not enough credits for this download. Top up at ${config.baseUrl} and run the command again.`);
    }
    throw err;
  });
  fs.mkdirSync(target, { recursive: true });
  extractZip(bytes, target);

  const versionFile = path.join(target, ".boilerplate-version");
  const templateVersion = fs.existsSync(versionFile) ? fs.readFileSync(versionFile, "utf-8").trim() : null;
  fs.writeFileSync(
    path.join(target, MARKER),
    JSON.stringify({ project: slug, templateVersion, apiUrl: config.baseUrl }, null, 2) + "\n",
  );
  io.log(`Downloaded to ${target} (${charged} credits charged).`);

  if (flags.install) {
    const run = (cmd, args) => (io.exec ?? execFileSync)(cmd, args, { cwd: target, stdio: "inherit" });
    run("git", ["init"]);
    run("git", ["remote", "add", "saas-forge", TEMPLATE_REMOTE]);
    run("pnpm", ["install"]);
    run("pnpm", ["generate"]);
  }
  io.log(
    flags.install
      ? `Next: cd ${path.relative(io.cwd, target) || "."} && pnpm doctor`
      : `Next: cd ${path.relative(io.cwd, target) || "."} && pnpm install && pnpm doctor`,
  );
  return { slug, target, charged };
}

export async function runUpgrade(flags, io) {
  const markerPath = path.join(io.cwd, MARKER);
  const marker = fs.existsSync(markerPath) ? JSON.parse(fs.readFileSync(markerPath, "utf-8")) : {};
  const slug = flags.project || marker.project;
  if (!slug) throw new Error(`No project. Run this inside a project with ${MARKER}, or pass --project <slug>.`);

  // Never let a project file pick where the API key is sent: a cloned repo
  // could point .saas-forge.json at another server.
  const { config, client } = requireClient(flags, io);
  if (marker.apiUrl && !flags.url && new URL(marker.apiUrl).origin !== new URL(config.baseUrl).origin) {
    throw new Error(
      `${MARKER} points at ${marker.apiUrl}, but your API key is for ${config.baseUrl}. Pass --url to choose the server explicitly.`,
    );
  }
  const [pricing, { project }] = await Promise.all([client.pricing(), client.getProject(slug)]);
  const toModules = withRequirements(pricing, [...project.modules, ...list(flags.add)]);
  const toTier = flags.tier || project.tierId;
  const quote = quoteUpgrade(pricing, project.modules, toModules, project.tierId, toTier);

  io.log(`Upgrade "${slug}": adds ${quote.added.join(", ") || "no modules"}, ${quote.tierSteps} tier step(s), ${quote.credits} credits.`);
  if (flags["dry-run"]) {
    // The same preview as the Upgrade Center: the kit's files and the release notes since this project's version.
    const { preview, releases } = await client.upgradePreview(slug, { modules: toModules, tierId: toTier });
    const migrations = preview.migrations.length ? `; ${preview.migrations.length} new migration(s), run pnpm migrate after applying` : "";
    io.log(`Files: ${preview.files.added} added, ${preview.files.modified} changed, ${preview.files.removed} removed${migrations}.`);
    if (releases.behind > 0) io.log(`${releases.behind} release(s) since v${releases.currentVersion}:`);
    for (const release of releases.releases) {
      io.log(`  v${release.version}`);
      for (const entry of release.entries) io.log(`    [${entry.type}] ${entry.title}${entry.migration ? " (migration)" : ""}`);
    }
    return { dryRun: true, ...quote, preview, releases };
  }
  if (quote.added.length === 0 && quote.tierSteps === 0) throw new Error("Nothing to upgrade.");
  if (!(await confirm(io, flags, "Buy this upgrade?"))) return { cancelled: true };

  const { bytes, charged } = await client.upgrade(slug, {
    modules: toModules,
    tierId: toTier,
    expectedTotalCredits: quote.credits,
  });
  extractZip(bytes, io.cwd);
  io.log(`Upgrade kit saved (${charged} credits). Follow UPGRADE.md, or run the upgrade-boilerplate skill in Claude Code.`);
  return { charged, ...quote };
}

export async function runCredits(flags, io) {
  const { client } = requireClient(flags, io);
  const { credits } = await client.credits();
  io.log(`Credits: ${credits.remaining} remaining (${credits.used} used of ${credits.total}).`);
  return credits;
}

export async function runLogin(flags, io) {
  const { baseUrl } = resolveConfig(flags, io.env);
  io.log(`Create an API key in SaaS Forge (${baseUrl}): Settings → API Keys.`);
  io.log("Give it read:me, read:projects, write:projects, scaffold:download and scaffold:upgrade.");
  const apiKey = (flags["api-key"] || (await io.ask("Paste the key: "))).trim();
  const client = io.createClient ? io.createClient({ baseUrl, apiKey }) : createClient({ baseUrl, apiKey });
  await client.me();
  const file = saveCredentials({ apiKey, baseUrl }, io.env);
  io.log(`Saved to ${file} (readable only by you).`);
  return { file };
}
