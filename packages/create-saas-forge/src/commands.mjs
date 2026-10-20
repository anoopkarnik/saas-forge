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

/** The project in the current folder: its marker, slug, the release its files are on, and an API client. */
function openProject(flags, io) {
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

  // The files are the truth: the server's saved version can lag a re-download.
  const versionFile = path.join(io.cwd, ".boilerplate-version");
  const fromVersion =
    marker.templateVersion || (fs.existsSync(versionFile) ? fs.readFileSync(versionFile, "utf-8").trim() : undefined) || undefined;
  return { markerPath, marker, slug, fromVersion, client };
}

/** Writes the release the project's files are now on to the marker and .boilerplate-version. */
function recordVersion(io, { markerPath, marker }, version) {
  if (fs.existsSync(markerPath)) {
    fs.writeFileSync(markerPath, JSON.stringify({ ...marker, templateVersion: version }, null, 2) + "\n");
  }
  const versionFile = path.join(io.cwd, ".boilerplate-version");
  if (fs.existsSync(versionFile)) fs.writeFileSync(versionFile, `${version}\n`);
}

/** After extracting a kit: a kit that carried release changes moves the project to its `toVersion`. */
function recordKitVersion(io, project) {
  const specPath = path.join(io.cwd, "UPGRADE_SPEC.json");
  if (!fs.existsSync(specPath)) return undefined;
  const spec = JSON.parse(fs.readFileSync(specPath, "utf-8"));
  if (!spec.toVersion || spec.fromVersion === spec.toVersion) return undefined;
  recordVersion(io, project, spec.toVersion);
  return spec.toVersion;
}

function logReleases(io, releases) {
  for (const release of releases.releases) {
    io.log(`  v${release.version}`);
    for (const entry of release.entries) io.log(`    [${entry.type}] ${entry.title}${entry.migration ? " (migration)" : ""}`);
  }
}

const noKitMessage = (version) =>
  `No update kit exists for v${version}. Apply the release notes by hand (create-saas-forge status lists them), ` +
  "then run create-saas-forge upgrade --mark-current.";

/** Whether the project is behind the latest release, and what changed since its version. */
export async function runStatus(flags, io) {
  const { slug, fromVersion, client } = openProject(flags, io);
  const { project } = await client.getProject(slug);
  const { preview, releases, releaseKit } = await client.upgradePreview(slug, {
    modules: project.modules,
    tierId: project.tierId,
    fromVersion,
  });
  const current = releaseKit?.fromVersion ?? releases.currentVersion;
  const latest = releaseKit?.latestVersion ?? releases.latestVersion;
  if (releases.behind === 0) {
    io.log(`"${slug}" is up to date (v${current}).`);
  } else {
    io.log(`"${slug}" is on v${current}; the latest is v${latest} (${releases.behind} release(s) behind):`);
    logReleases(io, releases);
    if (releaseKit?.available) {
      const { added, modified, removed } = preview.files;
      io.log(`A free update kit is ready (${added} added, ${modified} changed, ${removed} removed). Run: create-saas-forge upgrade`);
    } else if (releaseKit?.reason === "missing_snapshot") {
      io.log(noKitMessage(current));
    }
  }
  return { behind: releases.behind, fromVersion: current, latestVersion: latest, releaseKit };
}

export async function runUpgrade(flags, io) {
  if (flags["mark-current"] && (flags.add || flags.tier || flags.provider?.length || flags["dry-run"])) {
    throw new Error("--mark-current runs on its own; buy module, tier or provider upgrades separately.");
  }
  const opened = openProject(flags, io);
  const { slug, fromVersion, client } = opened;

  // A release that adds no modules has no kit: once its notes are applied by
  // hand, this records the new version (free) so the project is not "behind".
  if (flags["mark-current"]) {
    const result = await client.markCurrent(slug);
    recordVersion(io, opened, result.templateVersion);
    io.log(
      result.alreadyCurrent
        ? `"${slug}" is already on v${result.templateVersion}.`
        : `"${slug}" marked up to date: ${result.fromVersion} -> ${result.templateVersion} (free).`,
    );
    return result;
  }

  const [pricing, { project }] = await Promise.all([client.pricing(), client.getProject(slug)]);
  const toModules = withRequirements(pricing, [...project.modules, ...list(flags.add)]);
  const toTier = flags.tier || project.tierId;
  // --provider payment_gateway=dodo switches a provider; the kit swaps its code.
  const providers = Object.fromEntries((flags.provider ?? []).map((pair) => pair.split("=").map((part) => part.trim())));
  const quote = quoteUpgrade(pricing, project.modules, toModules, project.tierId, toTier);

  // Nothing bought: the free kit of the releases since the project's version.
  if (quote.added.length === 0 && quote.tierSteps === 0 && Object.keys(providers).length === 0) {
    const { preview, releases, releaseKit } = await client.upgradePreview(slug, { modules: toModules, tierId: toTier, fromVersion });
    if (!releaseKit?.available) {
      if (releaseKit?.reason === "missing_snapshot") throw new Error(noKitMessage(releaseKit.fromVersion));
      throw new Error("Nothing to upgrade.");
    }
    const { added, modified, removed } = preview.files;
    io.log(`Update "${slug}": v${releaseKit.fromVersion} -> v${releaseKit.latestVersion} (free). Files: ${added} added, ${modified} changed, ${removed} removed.`);
    logReleases(io, releases);
    if (flags["dry-run"]) return { dryRun: true, release: true, ...releaseKit, preview, releases };
    if (!(await confirm(io, flags, "Get this free update?"))) return { cancelled: true };

    const { bytes, charged } = await client.upgrade(slug, { modules: toModules, tierId: toTier, fromVersion });
    extractZip(bytes, io.cwd);
    const templateVersion = recordKitVersion(io, opened) ?? releaseKit.latestVersion;
    io.log("Update kit saved. Run the upgrade-boilerplate skill in Claude Code to merge it, or follow UPGRADE.md.");
    return { release: true, fromVersion: releaseKit.fromVersion, templateVersion, charged };
  }

  io.log(`Upgrade "${slug}": adds ${quote.added.join(", ") || "no modules"}, ${quote.tierSteps} tier step(s), ${quote.credits} credits.`);
  if (flags["dry-run"]) {
    // The same preview as the Upgrade Center: the kit's files and the release notes since this project's version.
    const { preview, releases } = await client.upgradePreview(slug, { modules: toModules, tierId: toTier, providers, fromVersion });
    const migrations = preview.migrations.length ? `; ${preview.migrations.length} new migration(s), run pnpm migrate after applying` : "";
    io.log(`Files: ${preview.files.added} added, ${preview.files.modified} changed, ${preview.files.removed} removed${migrations}.`);
    if (releases.behind > 0) io.log(`${releases.behind} release(s) since v${releases.currentVersion}:`);
    logReleases(io, releases);
    return { dryRun: true, ...quote, preview, releases };
  }
  if (!(await confirm(io, flags, "Buy this upgrade?"))) return { cancelled: true };

  const { bytes, charged } = await client.upgrade(slug, {
    modules: toModules,
    tierId: toTier,
    expectedTotalCredits: quote.credits,
    ...(Object.keys(providers).length ? { providers } : {}),
    ...(fromVersion ? { fromVersion } : {}),
  });
  extractZip(bytes, io.cwd);
  recordKitVersion(io, opened);
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
