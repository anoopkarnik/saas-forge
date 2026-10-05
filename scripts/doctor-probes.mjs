// Live checks for `pnpm doctor`. Each probe proves a credential works with one
// small read (or a write it removes again) and answers within TIMEOUT_MS:
//   ok   - the service accepted it
//   warn - could not verify (network, restricted key, unexpected answer)
//   fail - the service rejected it, or the host the user typed does not exist
// Messages may name hosts, users and accounts, never secret values.
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { pathToFileURL } from "node:url";

export const TIMEOUT_MS = 8000;

const ok = (message, data) => ({ status: "ok", message, data });
const warn = (message, data) => ({ status: "warn", message, data });
const fail = (message) => ({ status: "fail", message });

/** Imports a package as installed for one workspace (the starter does not hoist). */
async function importFrom(root, workspace, name) {
  const require = createRequire(path.join(root, workspace, "package.json"));
  const mod = await import(pathToFileURL(require.resolve(name)).href);
  return mod.default && !Object.keys(mod).some((key) => key !== "default") ? mod.default : mod;
}

async function loadPg(root) {
  const fromDatabase = createRequire(path.join(root, "packages/database/package.json"));
  const fromAdapter = createRequire(fromDatabase.resolve("@prisma/adapter-pg"));
  const pg = await import(pathToFileURL(fromAdapter.resolve("pg")).href);
  return pg.default ?? pg;
}

async function http(fetchImpl, url, init = {}) {
  const response = await fetchImpl(url, { ...init, signal: AbortSignal.timeout(TIMEOUT_MS) });
  const text = await response.text();
  let body = null;
  try {
    body = JSON.parse(text);
  } catch {
    // Not JSON; callers only read the status.
  }
  return { status: response.status, body };
}

function isLocalUrl(value) {
  try {
    const { hostname } = new URL(value);
    return ["localhost", "127.0.0.1", "0.0.0.0", "[::1]"].includes(hostname) || hostname.endsWith(".local");
  } catch {
    return false;
  }
}

/** Turns a failed Postgres connection into the one thing to fix. */
export function explainPostgresError(error, url) {
  let target = { host: "?", port: "5432", user: "?", database: "?" };
  try {
    const parsed = new URL(url);
    const user = decodeURIComponent(parsed.username);
    target = { host: parsed.hostname, port: parsed.port || "5432", user, database: parsed.pathname.slice(1) || user };
  } catch {
    // Format problems are reported by the env check.
  }
  const where = `${target.host}:${target.port}`;
  const message = String(error?.message ?? error);

  switch (error?.code) {
    case "ENOTFOUND":
    case "EAI_AGAIN":
      return `Host not found: ${target.host}. Check the host part of DATABASE_URL.`;
    case "ECONNREFUSED":
      return `Nothing accepts connections at ${where}. Is Postgres running, and is the port right?`;
    case "ETIMEDOUT":
      return `Timed out connecting to ${where}. Check the host, the port and any firewall.`;
    case "28P01":
      return `Password authentication failed for user "${target.user}". Copy the connection string again from your provider.`;
    case "28000":
      return `User "${target.user}" may not connect: ${message}`;
    case "3D000":
      return `Database "${target.database}" does not exist on ${target.host}. Create it, or fix the name at the end of DATABASE_URL.`;
    case "53300":
      return `${where} has no free connections. Use your provider's pooled connection string.`;
  }
  if (/timeout/i.test(message)) {
    return `Timed out connecting to ${where}. Check the host, the port and any firewall; a paused database can be slow to wake.`;
  }
  if (/ssl|tls|certificate/i.test(message)) {
    return `SSL problem with ${where}: ${message}. Hosted Postgres (Neon) needs ?sslmode=require; local Docker Postgres usually has no SSL.`;
  }
  return `Could not connect to ${where}: ${message}`;
}

/** Schemas the Prisma datasource declares, e.g. ["user_schema", ...]. */
function prismaSchemas(root) {
  const file = path.join(root, "packages/database/prisma/schema.prisma");
  if (!fs.existsSync(file)) return [];
  const list = fs.readFileSync(file, "utf-8").match(/schemas\s*=\s*\[([^\]]*)\]/)?.[1] ?? "";
  return [...list.matchAll(/"([^"]+)"/g)].map((match) => match[1]);
}

function migrationNames(root) {
  const dir = path.join(root, "packages/database/prisma/migrations");
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && fs.existsSync(path.join(dir, entry.name, "migration.sql")))
    .map((entry) => entry.name)
    .sort();
}

/** Extensions the migrations create, which the server must offer. */
function requiredExtensions(root) {
  const dir = path.join(root, "packages/database/prisma/migrations");
  const names = new Set();
  for (const migration of migrationNames(root)) {
    const sql = fs.readFileSync(path.join(dir, migration, "migration.sql"), "utf-8");
    for (const match of sql.matchAll(/CREATE\s+EXTENSION\s+(?:IF\s+NOT\s+EXISTS\s+)?"?([\w-]+)"?/gi)) {
      names.add(match[1]);
    }
  }
  return [...names];
}

async function probePostgres(url, root) {
  const { Client } = await loadPg(root);
  const client = new Client({ connectionString: url, connectionTimeoutMillis: TIMEOUT_MS, query_timeout: TIMEOUT_MS });
  try {
    await client.connect();
  } catch (error) {
    return fail(explainPostgresError(error, url));
  }
  try {
    const version = (await client.query("show server_version")).rows[0].server_version;
    const label = `PostgreSQL ${version.split(" ")[0]}`;

    const extensions = requiredExtensions(root);
    if (extensions.length > 0) {
      const { rows } = await client.query("select name from pg_available_extensions where name = any($1)", [extensions]);
      const missing = extensions.filter((name) => !rows.some((row) => row.name === name));
      if (missing.length > 0) {
        return fail(`${label} does not offer the ${missing.join(", ")} extension the migrations need. Use a Postgres that includes it (Neon does).`);
      }
    }

    const schemas = prismaSchemas(root);
    const { rows: present } = await client.query(
      "select schema_name from information_schema.schemata where schema_name = any($1)",
      [schemas],
    );
    const missingSchemas = schemas.filter((name) => !present.some((row) => row.schema_name === name));

    const migrations = migrationNames(root);
    const tracked = (await client.query("select to_regclass('_prisma_migrations') is not null as tracked")).rows[0].tracked;
    const applied = tracked
      ? (
          await client.query(
            "select migration_name from _prisma_migrations where finished_at is not null and rolled_back_at is null",
          )
        ).rows.map((row) => row.migration_name)
      : [];
    const pending = migrations.filter((name) => !applied.includes(name));

    const data = { fresh: !tracked, pendingMigrations: pending.length };
    if (pending.length > 0 || missingSchemas.length > 0) {
      const parts = [];
      if (pending.length > 0) parts.push(`${pending.length} of ${migrations.length} migrations not applied`);
      if (missingSchemas.length > 0) parts.push(`schemas missing: ${missingSchemas.join(", ")}`);
      return warn(`${label} connected; ${parts.join("; ")}. Run pnpm migrate.`, data);
    }
    return ok(`${label} connected; ${schemas.length} schemas and ${migrations.length} migrations in place`, data);
  } finally {
    await client.end().catch(() => {});
  }
}

async function probeResend(env, fetchImpl) {
  const domain = env.NEXT_PUBLIC_SUPPORT_MAIL?.split("@")[1]?.toLowerCase();
  const { status, body } = await http(fetchImpl, "https://api.resend.com/domains", {
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}` },
  });
  if (status === 200) {
    if (!domain) return ok("API key works");
    if (domain === "resend.dev") return ok("API key works; resend.dev test sender only reaches your own address");
    const found = (body?.data ?? []).find((entry) => entry.name?.toLowerCase() === domain);
    if (!found) {
      return warn(`API key works, but ${domain} (NEXT_PUBLIC_SUPPORT_MAIL) is not in this account. Add it at https://resend.com/domains`);
    }
    return found.status === "verified"
      ? ok(`API key works; ${domain} is verified`)
      : warn(`${domain} is ${found.status}; emails fail until it is verified at https://resend.com/domains`);
  }
  if (/restricted/i.test(body?.message ?? "")) return warn("API key can only send, so the sending domain was not checked");
  if (status === 401 || status === 403) return fail(`Resend rejected RESEND_API_KEY (${body?.message ?? status})`);
  return warn(`could not verify (Resend answered ${status})`);
}

// scaffold:begin billing
async function probeStripe(env, fetchImpl) {
  const auth = { headers: { Authorization: `Bearer ${env.STRIPE_SECRET_KEY}` } };
  const account = await http(fetchImpl, "https://api.stripe.com/v1/account", auth);
  if (account.status === 401) return fail(`Stripe rejected STRIPE_SECRET_KEY (${account.body?.error?.message ?? 401})`);
  if (account.status !== 200) return warn(`could not verify (Stripe answered ${account.status})`);

  const mode = env.STRIPE_SECRET_KEY.includes("_live_") ? "live" : "test";
  const name = `${account.body?.settings?.dashboard?.display_name ?? account.body?.id} (${mode} mode)`;
  const base = env.NEXT_PUBLIC_URL;
  if (!base || isLocalUrl(base)) {
    const local = base ? new URL(base).host : "localhost:3000";
    return ok(`${name}. Forward webhooks locally with: stripe listen --forward-to ${local}/api/payments/stripe/webhook`);
  }

  const webhookUrl = new URL("/api/payments/stripe/webhook", base).href;
  const hooks = await http(fetchImpl, "https://api.stripe.com/v1/webhook_endpoints?limit=100", auth);
  if (hooks.status !== 200) return warn(`${name}; could not list webhook endpoints (Stripe answered ${hooks.status})`);
  const endpoint = (hooks.body?.data ?? []).find((hook) => hook.url === webhookUrl);
  if (!endpoint) return warn(`${name}, but no webhook endpoint for ${webhookUrl}. Add one at https://dashboard.stripe.com/webhooks`);
  if (endpoint.status !== "enabled") return warn(`${name}; webhook endpoint ${webhookUrl} is ${endpoint.status}`);
  return ok(`${name}; webhook endpoint ${webhookUrl} is enabled`);
}

async function probeDodo(env, fetchImpl) {
  const mode = env.DODO_PAYMENTS_ENVIRONMENT || "live_mode";
  const base = mode === "test_mode" ? "https://test.dodopayments.com" : "https://live.dodopayments.com";
  const { status } = await http(fetchImpl, `${base}/products?page_size=1`, {
    headers: { Authorization: `Bearer ${env.DODO_PAYMENTS_API_KEY}` },
  });
  if (status === 200) return ok(`API key works (${mode})`);
  if (status === 401) {
    return fail(`Dodo rejected DODO_PAYMENTS_API_KEY in ${mode}. A key only works in the mode it was made in (DODO_PAYMENTS_ENVIRONMENT).`);
  }
  return warn(`could not verify (Dodo answered ${status})`);
}
// scaffold:end billing

async function probeUpstash(env, fetchImpl) {
  const { status, body } = await http(fetchImpl, `${env.UPSTASH_REDIS_REST_URL.replace(/\/$/, "")}/ping`, {
    headers: { Authorization: `Bearer ${env.UPSTASH_REDIS_REST_TOKEN}` },
  });
  if (status === 200 && body?.result === "PONG") return ok("PING answered PONG");
  if (status === 401) return fail("Upstash rejected UPSTASH_REDIS_REST_TOKEN");
  return warn(`could not verify (Upstash answered ${status})`);
}

async function probeBlob(env, root) {
  const { put, del } = await importFrom(root, "apps/web", "@vercel/blob");
  const token = env.BLOB_READ_WRITE_TOKEN;
  try {
    const blob = await put(`saas-forge-doctor/probe.txt`, "ok", {
      access: "public",
      token,
      addRandomSuffix: true,
      abortSignal: AbortSignal.timeout(TIMEOUT_MS),
    });
    await del(blob.url, { token, abortSignal: AbortSignal.timeout(TIMEOUT_MS) });
    return ok("wrote and deleted a probe file");
  } catch (error) {
    if (error?.name === "BlobAccessError") return fail("Vercel Blob rejected BLOB_READ_WRITE_TOKEN");
    throw error;
  }
}

async function probeR2(env, root) {
  const { S3Client, PutObjectCommand, DeleteObjectCommand } = await importFrom(root, "apps/web", "@aws-sdk/client-s3");
  const bucket = env.R2_BUCKET_NAME;
  const client = new S3Client({
    region: "auto",
    endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: env.R2_ACCESS_KEY_ID, secretAccessKey: env.R2_SECRET_ACCESS_KEY },
  });
  const key = `saas-forge-doctor/probe-${Date.now()}.txt`;
  try {
    await client.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: "ok" }), {
      abortSignal: AbortSignal.timeout(TIMEOUT_MS),
    });
    await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }), {
      abortSignal: AbortSignal.timeout(TIMEOUT_MS),
    });
    return ok("wrote and deleted a probe object");
  } catch (error) {
    if (error?.name === "NoSuchBucket") return fail("R2_BUCKET_NAME is not a bucket in this account");
    if (["InvalidAccessKeyId", "SignatureDoesNotMatch", "AccessDenied", "Unauthorized"].includes(error?.name)) {
      return fail(`R2 rejected the credentials (${error.name}). Check R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY and that the token can write to the bucket.`);
    }
    throw error;
  } finally {
    client.destroy();
  }
}

async function probeNotion(env, fetchImpl) {
  const { status, body } = await http(fetchImpl, "https://api.notion.com/v1/users/me", {
    headers: { Authorization: `Bearer ${env.NOTION_API_TOKEN}`, "Notion-Version": "2022-06-28" },
  });
  if (status === 200) return ok(`integration "${body?.name ?? "unnamed"}" connected`);
  if (status === 401) return fail("Notion rejected NOTION_API_TOKEN");
  return warn(`could not verify (Notion answered ${status})`);
}

/**
 * The probes this env turns on. `keys` are the values a failed probe asks for
 * again; `userHost` marks probes whose host comes from the env, so an unknown
 * host is the user's typo rather than a network problem.
 */
export function activeProbes(env, { root, fetchImpl = fetch }) {
  const probes = [];
  const add = (id, label, keys, run, userHost = false) => {
    if (keys.every((key) => env[key])) probes.push({ id, label, keys, run, userHost });
  };

  add("postgres", "Postgres", ["DATABASE_URL"], () => probePostgres(env.DATABASE_URL, root), true);
  if (env.NEXT_PUBLIC_EMAIL_CLIENT === "resend") {
    add("resend", "Resend", ["RESEND_API_KEY"], () => probeResend(env, fetchImpl));
  }
  // scaffold:begin billing
  if (env.NEXT_PUBLIC_PAYMENT_GATEWAY === "stripe") {
    add("stripe", "Stripe", ["STRIPE_SECRET_KEY"], () => probeStripe(env, fetchImpl));
  }
  if (env.NEXT_PUBLIC_PAYMENT_GATEWAY === "dodo") {
    add("dodo", "Dodo Payments", ["DODO_PAYMENTS_API_KEY"], () => probeDodo(env, fetchImpl));
  }
  // scaffold:end billing
  if (env.NEXT_PUBLIC_ALLOW_RATE_LIMIT === "upstash") {
    const keys = ["UPSTASH_REDIS_REST_URL", "UPSTASH_REDIS_REST_TOKEN"];
    add("upstash", "Upstash Redis", keys, () => probeUpstash(env, fetchImpl), true);
  }
  if (env.NEXT_PUBLIC_IMAGE_STORAGE === "vercel_blob") {
    add("vercel_blob", "Vercel Blob", ["BLOB_READ_WRITE_TOKEN"], () => probeBlob(env, root));
  }
  if (env.NEXT_PUBLIC_IMAGE_STORAGE === "cloudflare_r2") {
    const keys = ["R2_ACCOUNT_ID", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_BUCKET_NAME"];
    add("r2", "Cloudflare R2", keys, () => probeR2(env, root), true);
  }
  if (env.NEXT_PUBLIC_CMS === "notion") {
    add("notion", "Notion", ["NOTION_API_TOKEN"], () => probeNotion(env, fetchImpl));
  }
  return probes;
}

/** Runs one probe; anything unexpected becomes "could not verify". */
export async function runProbe(probe) {
  try {
    return await probe.run();
  } catch (error) {
    const cause = error?.cause ?? error;
    if (probe.userHost && (cause?.code === "ENOTFOUND" || cause?.code === "EAI_AGAIN")) {
      return fail(`host not found: ${cause.hostname ?? "check the URL"}`);
    }
    if (error?.name === "TimeoutError" || cause?.name === "TimeoutError") {
      return warn(`could not verify: no answer within ${TIMEOUT_MS / 1000}s`);
    }
    return warn(`could not verify: ${cause?.message ?? error}`);
  }
}
