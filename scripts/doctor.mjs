#!/usr/bin/env node
// pnpm doctor: gets this project's environment to a booting app.
//
//   pnpm doctor          asks for missing values, generates secrets, checks each
//                        service live, then writes the .env files
//   pnpm doctor --check  reports only; exits 1 when something would stop the app
//   pnpm doctor --json   the --check report as JSON
//
// The rules come from apps/web/lib/env.ts (the same function boot validation
// runs), so the doctor and `next start` never disagree. Secret values are never
// printed, in any mode.
import { execFileSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import readline from "node:readline/promises";
import { Writable } from "node:stream";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { nativeEnvValues } from "../apps/web/lib/env-files.ts";
import { findServerEnvIssues } from "../apps/web/lib/env.ts";
import { isSecretEnvKey } from "../packages/ui/src/lib/scaffold-secrets.ts";
import { activeProbes, runProbe } from "./doctor-probes.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

// Modules in this project. A download without a module has no entry for it.
const MODULES = [
  // scaffold:begin billing
  "billing",
  // scaffold:end billing
  // scaffold:begin multi_tenancy
  "multi_tenancy",
  // scaffold:end multi_tenancy
  // scaffold:begin ai
  "ai",
  // scaffold:end ai
  // scaffold:begin ai_agents
  "ai_agents",
  // scaffold:end ai_agents
  // scaffold:begin api_keys
  "api_keys",
  // scaffold:end api_keys
  // scaffold:begin jobs
  "jobs",
  // scaffold:end jobs
  // scaffold:begin notifications
  "notifications",
  // scaffold:end notifications
  // scaffold:begin audit_log
  "audit_log",
  // scaffold:end audit_log
];

// Next.js reads apps/web/.env, then .env.local over it; shell variables win.
const WEB_ENV = "apps/web/.env";
const WEB_ENV_LOCAL = "apps/web/.env.local";

/** Secrets the doctor makes instead of asking for. */
const GENERATED = {
  BETTER_AUTH_SECRET: () => randomBytes(32).toString("base64"),
  // scaffold:begin ai_agents
  BACKEND_HMAC_SECRET: () => randomBytes(32).toString("hex"),
  // scaffold:end ai_agents
};

/** Where to get each value. */
const HINTS = {
  NEXT_PUBLIC_URL: "Where the web app runs, e.g. http://localhost:3000.",
  DATABASE_URL:
    "Postgres connection string. Neon: https://console.neon.tech → your project → Connect. Local Docker: postgresql://postgres:postgres@localhost:5432/postgres",
  NEXT_PUBLIC_EMAIL_CLIENT:
    "Type resend to send sign-up emails, or set NEXT_PUBLIC_AUTH_EMAIL=false in apps/web/.env to turn off email sign-up.",
  NEXT_PUBLIC_SUPPORT_MAIL: "The address emails come from, on a domain verified at https://resend.com/domains.",
  RESEND_API_KEY: "https://resend.com/api-keys",
  AUTH_GOOGLE_CLIENT_ID: "https://console.cloud.google.com/apis/credentials → Create credentials → OAuth client ID.",
  AUTH_GOOGLE_CLIENT_SECRET: "Same OAuth client: https://console.cloud.google.com/apis/credentials",
  AUTH_GITHUB_CLIENT_ID: "https://github.com/settings/developers → OAuth Apps.",
  AUTH_GITHUB_CLIENT_SECRET: "Same GitHub OAuth App → Generate a new client secret.",
  AUTH_LINKEDIN_CLIENT_ID: "https://www.linkedin.com/developers/apps → your app → Auth.",
  AUTH_LINKEDIN_CLIENT_SECRET: "Same LinkedIn app → Auth.",
  // scaffold:begin billing
  // scaffold:begin payment_gateway.stripe
  STRIPE_SECRET_KEY: "https://dashboard.stripe.com/apikeys (sk_test_… while testing).",
  STRIPE_WEBHOOK_SECRET:
    "https://dashboard.stripe.com/webhooks → your endpoint → Signing secret. Locally, `stripe listen --forward-to localhost:3000/api/payments/stripe/webhook` prints one.",
  // scaffold:end payment_gateway.stripe
  // scaffold:begin payment_gateway.dodo
  DODO_PAYMENTS_API_KEY: "https://app.dodopayments.com → Developer → API Keys.",
  DODO_PAYMENTS_WEBHOOK_KEY: "https://app.dodopayments.com → Developer → Webhooks → your endpoint's secret.",
  // scaffold:end payment_gateway.dodo
  // scaffold:end billing
  // scaffold:begin image_storage.vercel_blob
  BLOB_READ_WRITE_TOKEN: "https://vercel.com/dashboard/stores → your Blob store → .env.local tab.",
  // scaffold:end image_storage.vercel_blob
  // scaffold:begin image_storage.cloudflare_r2
  R2_ACCOUNT_ID: "https://dash.cloudflare.com → R2 → Account ID.",
  R2_ACCESS_KEY_ID: "https://dash.cloudflare.com → R2 → Manage R2 API Tokens.",
  R2_SECRET_ACCESS_KEY: "Same R2 API token.",
  R2_BUCKET_NAME: "A bucket under https://dash.cloudflare.com → R2.",
  // scaffold:end image_storage.cloudflare_r2
  // scaffold:begin jobs
  INNGEST_EVENT_KEY: "https://app.inngest.com → Manage → Event Keys, or the key your self-hosted server was started with.",
  INNGEST_SIGNING_KEY: "https://app.inngest.com → Manage → Signing Key, or your self-hosted server's signing key.",
  // scaffold:end jobs
  UPSTASH_REDIS_REST_URL: "https://console.upstash.com/redis → your database → REST API.",
  UPSTASH_REDIS_REST_TOKEN: "Same Upstash database → REST API.",
  // scaffold:begin cms.notion
  NOTION_API_TOKEN: "https://www.notion.so/profile/integrations → your integration → Internal Integration Secret.",
  // scaffold:end cms.notion
};

/** Shape checks for values boot validation accepts as any non-empty string. */
const FORMATS = {
  NEXT_PUBLIC_SUPPORT_MAIL: [/^[^@\s]+@[^@\s]+\.[^@\s]+$/, "should be an email address"],
  RESEND_API_KEY: [/^re_/, "Resend keys start with re_"],
  AUTH_GOOGLE_CLIENT_ID: [/\.apps\.googleusercontent\.com$/, "Google client IDs end with .apps.googleusercontent.com"],
  // scaffold:begin billing
  // scaffold:begin payment_gateway.stripe
  STRIPE_SECRET_KEY: [/^(sk|rk)_(test|live)_/, "Stripe secret keys start with sk_test_ or sk_live_"],
  STRIPE_WEBHOOK_SECRET: [/^whsec_/, "Stripe webhook secrets start with whsec_"],
  // scaffold:end payment_gateway.stripe
  // scaffold:end billing
  UPSTASH_REDIS_REST_URL: [/^https:\/\//, "should be the https:// REST URL"],
};

/** Parses KEY=value lines the way dotenv does (quotes and inline comments). */
export function parseEnv(content) {
  const values = {};
  for (const line of content.split(/\r?\n/)) {
    const match = line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!match) continue;
    let value = match[2].trim();
    const quote = value[0];
    const end = quote === '"' || quote === "'" || quote === "`" ? value.indexOf(quote, 1) : -1;
    if (end > 0) {
      value = value.slice(1, end);
      if (quote === '"') value = value.replace(/\\n/g, "\n");
    } else {
      value = value.replace(/\s+#.*$/, "");
    }
    values[match[1]] = value;
  }
  return values;
}

const unquote = (value) => parseEnv(`X=${value ?? ""}`).X;

function formatValue(value) {
  if (/^(["'`]).*\1$/s.test(value)) return value;
  return /[\s#"'`\\]/.test(value) ? JSON.stringify(value) : value;
}

/** Sets values in a .env file's text, in place where the key exists, appended otherwise. */
export function setEnvValues(content, values) {
  const pending = new Map(Object.entries(values));
  const lines = content.split("\n").map((line) => {
    const key = line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=/)?.[1];
    if (!key || !pending.has(key)) return line;
    const value = pending.get(key);
    pending.delete(key);
    return `${key}=${formatValue(value)}`;
  });
  let text = lines.join("\n");
  if (pending.size > 0) {
    if (text && !text.endsWith("\n")) text += "\n";
    text += [...pending].map(([key, value]) => `${key}=${formatValue(value)}`).join("\n") + "\n";
  }
  return text;
}

/** Reads the project's env files. `env` is what the web server would see. */
export function loadProject(root = ROOT, processEnv = process.env) {
  const read = (rel) => {
    const file = path.join(root, rel);
    return fs.existsSync(file) ? fs.readFileSync(file, "utf-8") : null;
  };
  const example = read("apps/web/.env.example") ?? "";
  const files = { [WEB_ENV]: read(WEB_ENV), [WEB_ENV_LOCAL]: read(WEB_ENV_LOCAL) };

  // A fresh download may ship only .env.example; the doctor writes .env from it.
  const env = { ...parseEnv(files[WEB_ENV] ?? example), ...parseEnv(files[WEB_ENV_LOCAL] ?? "") };
  const known = new Set([...Object.keys(parseEnv(example)), ...Object.keys(env)]);
  for (const key of known) {
    if (processEnv[key] !== undefined) env[key] = processEnv[key];
  }

  const platforms = ["web", ...["desktop", "mobile"].filter((app) => fs.existsSync(path.join(root, "apps", app)))];
  return { root, example, files, env, changes: {}, platforms, modules: MODULES, read, processEnv };
}

function setValue(project, key, value) {
  project.env[key] = value;
  project.changes[key] = value;
}

/** The problem with a value, or null. Uses boot validation, then the shape checks. */
function valueProblem(key, value, env) {
  const issue = findServerEnvIssues({ ...env, [key]: value }).find((entry) => entry.key === key);
  if (issue) return `${key} ${issue.message}`;
  const format = FORMATS[key];
  if (format && !format[0].test(value)) return `${key} ${format[1]}`;
  return null;
}

/**
 * Every file the doctor would write, with the keys that change. The web file
 * gets the values set in this run; the rest follow from the web values.
 */
export function planFiles(project) {
  const plans = [];
  const plan = (rel, values, template) => {
    const current = project.read(rel);
    const existing = parseEnv(current ?? "");
    const changed = Object.keys(values).filter((key) => current === null || unquote(values[key]) !== existing[key]);
    if (changed.length === 0) return;
    const base = current ?? (template !== undefined ? project.read(template) ?? "" : "");
    plans.push({ file: rel, created: current === null, keys: changed, content: setEnvValues(base, values) });
  };

  // Each changed web value goes to the file that defines it now, so .env.local keeps winning.
  const local = parseEnv(project.files[WEB_ENV_LOCAL] ?? "");
  const toLocal = {};
  const toEnv = {};
  for (const [key, value] of Object.entries(project.changes)) {
    (key in local ? toLocal : toEnv)[key] = value;
  }
  if (Object.keys(toEnv).length > 0) plan(WEB_ENV, toEnv, "apps/web/.env.example");
  if (Object.keys(toLocal).length > 0) plan(WEB_ENV_LOCAL, toLocal);

  const { env } = project;
  // The Prisma CLI reads only packages/database/.env (shell variables win). A
  // different URL there can be deliberate (a direct URL for migrations), so the
  // doctor only fills it in when it is empty.
  if (env.DATABASE_URL && !prismaDatabaseUrl(project)) {
    plan("packages/database/.env", { DATABASE_URL: env.DATABASE_URL }, "packages/database/.env.example");
  }
  // scaffold:begin ai_agents
  if (env.BACKEND_HMAC_SECRET && fs.existsSync(path.join(project.root, "apps/backend"))) {
    plan("apps/backend/.env", { BACKEND_HMAC_SECRET: env.BACKEND_HMAC_SECRET }, "apps/backend/.env.example");
  }
  // scaffold:end ai_agents

  // The download wizard records support features; here they follow from the values set.
  const support = [
    env.NEXT_PUBLIC_SUPPORT_MAIL ? "support_mail" : null,
    env.NEXT_PUBLIC_CALENDLY_BOOKING_URL ? "calendly" : null,
  ].filter(Boolean);
  const native = nativeEnvValues({ ...env, NEXT_PUBLIC_SUPPORT_FEATURES: support.join(",") }, project.modules);
  for (const app of ["mobile", "desktop"]) {
    if (!project.platforms.includes(app)) continue;
    const template = `apps/${app}/.env.example`;
    const templateKeys = Object.keys(parseEnv(project.read(template) ?? ""));
    const values = Object.fromEntries(Object.entries(native[app]).filter(([key]) => templateKeys.includes(key)));
    plan(`apps/${app}/.env`, values, template);
  }
  return plans;
}

function prismaDatabaseUrl(project) {
  return project.processEnv.DATABASE_URL ?? parseEnv(project.read("packages/database/.env") ?? "").DATABASE_URL;
}

/** host/database of a Postgres URL, without credentials. */
function describeDatabase(url) {
  try {
    const parsed = new URL(url);
    return `${parsed.host}${parsed.pathname}`;
  } catch {
    return "an unparsable URL";
  }
}

/** The report behind --check and --json. */
export async function diagnose(project, { probes = activeProbes, fetchImpl = fetch } = {}) {
  const checks = [];
  const failing = new Set();
  for (const issue of findServerEnvIssues(project.env)) {
    failing.add(issue.key);
    checks.push({ group: "env", id: issue.key, status: "fail", message: `${issue.key} ${issue.message}` });
  }
  for (const [key, [pattern, hint]] of Object.entries(FORMATS)) {
    const value = project.env[key];
    if (value && !failing.has(key) && !pattern.test(value)) {
      checks.push({ group: "env", id: key, status: "warn", message: `${key} ${hint}` });
    }
  }

  for (const plan of planFiles(project)) {
    const database = plan.file === "packages/database/.env";
    checks.push({
      group: "files",
      id: plan.file,
      status: database ? "fail" : "warn",
      message: database
        ? `${plan.file} has no DATABASE_URL, and pnpm migrate reads it from there`
        : plan.created
          ? `${plan.file} is missing`
          : `${plan.file} is out of date: ${plan.keys.join(", ")}`,
    });
  }
  const prismaUrl = prismaDatabaseUrl(project);
  if (prismaUrl && project.env.DATABASE_URL && prismaUrl !== project.env.DATABASE_URL) {
    checks.push({
      group: "files",
      id: "packages/database/.env",
      status: "warn",
      message: `pnpm migrate uses ${describeDatabase(prismaUrl)} but the web app uses ${describeDatabase(project.env.DATABASE_URL)}`,
    });
  }

  if (probes) {
    for (const probe of probes(project.env, { root: project.root, fetchImpl })) {
      if (probe.keys.some((key) => failing.has(key))) continue;
      const result = await runProbe(probe);
      checks.push({ group: "services", id: probe.id, label: probe.label, ...result });
    }
  }

  return {
    ok: checks.every((check) => check.status !== "fail"),
    modules: project.modules,
    platforms: project.platforms,
    checks,
  };
}

/** Replaces every secret value (and the database password) with ****. */
function redactor(env) {
  const secrets = Object.entries(env)
    .filter(([key, value]) => value && value.length >= 6 && isSecretEnvKey(key))
    .map(([, value]) => value);
  try {
    const password = new URL(env.DATABASE_URL).password;
    if (password) secrets.push(password, decodeURIComponent(password));
  } catch {
    // No parsable database URL.
  }
  secrets.sort((a, b) => b.length - a.length);
  return (text) => secrets.reduce((result, secret) => result.split(secret).join("****"), String(text));
}

const ICON = { ok: "✓", warn: "⚠", fail: "✗" };

function printReport(report, io, redact) {
  const titles = { env: "Environment (apps/web)", files: "Env files", services: "Services" };
  for (const group of ["env", "files", "services"]) {
    const checks = report.checks.filter((check) => check.group === group);
    if (checks.length === 0) continue;
    io.log(`\n${titles[group]}`);
    for (const check of checks) {
      io.log(redact(`  ${ICON[check.status]} ${check.label ? `${check.label}: ` : ""}${check.message}`));
    }
  }
  const failures = report.checks.filter((check) => check.status === "fail").length;
  io.log(failures === 0 ? "\nNo problems found." : `\n${failures} problem(s). Run pnpm doctor to fix them.`);
}

/** Asks for one value until it passes the checks; false when the user skips. */
async function askForValue(project, io, key, reason) {
  io.log(`\n✗ ${key} ${reason}`);
  if (GENERATED[key]) {
    if (!(await io.confirm(`  Generate a new ${key}?`, true))) return false;
    setValue(project, key, GENERATED[key]());
    io.log("  ✓ generated");
    return true;
  }
  if (key.startsWith("NEXT_PUBLIC_") && reason.includes("looks like a secret")) {
    io.log("  Rename it without NEXT_PUBLIC_ (and the code that reads it), or remove it.");
    return false;
  }
  if (HINTS[key]) io.log(`  ${HINTS[key]}`);
  for (let attempt = 0; attempt < 3; attempt++) {
    const value = (await io.ask(`  ${key} (Enter to skip): `, { secret: isSecretEnvKey(key) })).trim();
    if (!value) return false;
    const problem = valueProblem(key, value, project.env);
    if (!problem) {
      setValue(project, key, value);
      return true;
    }
    io.log(`  ✗ ${problem}`);
  }
  return false;
}

async function interactive(project, io, { probes = activeProbes, fetchImpl = fetch } = {}) {
  const redact = (text) => redactor(project.env)(text);

  // 1. Missing, weak and malformed values, in the order boot validation reports them.
  const handled = new Set();
  for (;;) {
    const issue = findServerEnvIssues(project.env).find((entry) => !handled.has(entry.key));
    if (!issue) break;
    handled.add(issue.key);
    await askForValue(project, io, issue.key, issue.message);
  }
  for (const [key, [pattern, hint]] of Object.entries(FORMATS)) {
    const value = project.env[key];
    if (value && !handled.has(key) && !pattern.test(value)) {
      handled.add(key);
      io.log(`\n⚠ ${key} ${hint}`);
      if (await io.confirm(`  Enter ${key} again?`, true)) await askForValue(project, io, key, "needs a new value");
    }
  }

  // 2. Live checks; a rejected credential can be entered again.
  const failing = new Set(findServerEnvIssues(project.env).map((issue) => issue.key));
  let database = null;
  if (probes) {
    io.log("\nChecking services…");
    for (const probe of probes(project.env, { root: project.root, fetchImpl })) {
      if (probe.keys.some((key) => failing.has(key))) continue;
      let result = await runProbe(probe);
      for (let attempt = 0; result.status === "fail" && attempt < 2; attempt++) {
        io.log(redact(`  ✗ ${probe.label}: ${result.message}`));
        if (!(await io.confirm(`  Enter ${probe.keys.join(", ")} again?`, true))) break;
        let changed = false;
        for (const key of probe.keys) changed = (await askForValue(project, io, key, "needs a new value")) || changed;
        if (!changed) break;
        // Probes read env when they run, so rebuild this one with the new values.
        const again = probes(project.env, { root: project.root, fetchImpl }).find((entry) => entry.id === probe.id);
        if (!again) break;
        result = await runProbe(again);
      }
      io.log(redact(`  ${ICON[result.status]} ${probe.label}: ${result.message}`));
      if (probe.id === "postgres") database = result;
    }
  }

  // 3. Write the env files.
  const plans = planFiles(project);
  if (plans.length > 0) {
    io.log("\nFiles to write (values are not shown):");
    for (const plan of plans) io.log(`  ${plan.file}${plan.created ? " (new)" : ""}: ${plan.keys.join(", ")}`);
    if (await io.confirm("Write these files?", true)) {
      for (const plan of plans) {
        const file = path.join(project.root, plan.file);
        fs.mkdirSync(path.dirname(file), { recursive: true });
        // Env files hold secrets: owner-only, also when the file already existed
        // (writeFileSync's mode only applies on creation).
        fs.writeFileSync(file, plan.content, { mode: 0o600 });
        fs.chmodSync(file, 0o600);
      }
      io.log("  ✓ written");
    }
  }

  // 4. Database setup when the database is reachable but not ready.
  const clientMissing = !fs.existsSync(path.join(project.root, "packages/database/src/generated/prisma"));
  const pending = database && database.status !== "fail" ? database.data?.pendingMigrations ?? 0 : 0;
  const commands = [
    ...(clientMissing || pending > 0 ? ["generate"] : []),
    ...(pending > 0 ? ["migrate"] : []),
    ...(pending > 0 && database?.data?.fresh ? ["seed"] : []),
  ];
  if (commands.length > 0 && (await io.confirm(`\nRun ${commands.map((name) => `pnpm ${name}`).join(", ")} now?`, true))) {
    for (const name of commands) io.exec("pnpm", [name], project.root);
  }

  const remaining = findServerEnvIssues(project.env);
  if (remaining.length === 0) {
    io.log("\nReady. Start the app with: pnpm dev");
    return 0;
  }
  io.log(`\nStill missing: ${remaining.map((issue) => issue.key).join(", ")}. Run pnpm doctor again once you have them.`);
  return 1;
}

function terminalIo() {
  let muted = false;
  const output = new Writable({
    write(chunk, _encoding, callback) {
      if (!muted) process.stdout.write(chunk);
      callback();
    },
  });
  let rl = null;
  const prompt = async (question, secret) => {
    rl ??= readline.createInterface({ input: process.stdin, output, terminal: true });
    const answer = rl.question(question);
    muted = secret;
    try {
      return await answer;
    } finally {
      if (muted) process.stdout.write("\n");
      muted = false;
    }
  };
  return {
    log: (line) => console.log(line),
    ask: (question, { secret = false } = {}) => prompt(question, secret),
    confirm: async (question, defaultYes) => {
      const answer = (await prompt(`${question} ${defaultYes ? "(Y/n)" : "(y/N)"} `, false)).trim().toLowerCase();
      return answer === "" ? defaultYes : answer.startsWith("y");
    },
    exec: (command, args, cwd) => {
      // Give the terminal back (readline holds it in raw mode) so the command can prompt.
      rl?.close();
      rl = null;
      execFileSync(command, args, { cwd, stdio: "inherit" });
    },
    close: () => rl?.close(),
  };
}

/** Entry point; returns the exit code. */
export async function runDoctor(argv, { root = ROOT, processEnv = process.env, io, probes, fetchImpl, isTTY = process.stdin.isTTY } = {}) {
  const { values: flags } = parseArgs({ args: argv, options: { check: { type: "boolean" }, json: { type: "boolean" } } });
  const project = loadProject(root, processEnv);
  io ??= terminalIo();
  const options = { ...(probes !== undefined ? { probes } : {}), ...(fetchImpl ? { fetchImpl } : {}) };

  try {
    if (flags.json || flags.check || !isTTY) {
      const report = await diagnose(project, options);
      const redact = redactor(project.env);
      if (flags.json) {
        io.log(redact(JSON.stringify(report, (key, value) => (key === "data" ? undefined : value), 2)));
      } else {
        if (!flags.check) io.log("Not a terminal, so only checking (pnpm doctor --check).");
        io.log(`SaaS Forge doctor · modules: ${project.modules.join(", ") || "none"} · platforms: ${project.platforms.join(", ")}`);
        printReport(report, io, redact);
      }
      return report.ok ? 0 : 1;
    }

    io.log(`SaaS Forge doctor · modules: ${project.modules.join(", ") || "none"} · platforms: ${project.platforms.join(", ")}`);
    return await interactive(project, io, options);
  } finally {
    io.close?.();
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exitCode = await runDoctor(process.argv.slice(2));
}
