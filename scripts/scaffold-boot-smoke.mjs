#!/usr/bin/env node
/**
 * Boot smoke for one compiled scaffold variant: migrate a throwaway Postgres,
 * check the migrations produce exactly the variant's schema, seed, production-
 * build the web app, start it and sign up a user.
 *
 *   DATABASE_URL=postgresql://... node scripts/scaffold-boot-smoke.mjs .generated/variants/none
 *
 * The variant must already be installed (`scaffold-matrix.mjs --only <name> --keep`).
 * Variants with the ai module need `CREATE EXTENSION vector` (e.g. pgvector/pgvector:pg16).
 */
import { spawn, spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import path from "node:path";

const variantDir = path.resolve(process.argv[2] ?? "");
const databaseUrl = process.env.DATABASE_URL;
if (!process.argv[2] || !databaseUrl) {
  console.error("Usage: DATABASE_URL=postgresql://... node scripts/scaffold-boot-smoke.mjs <variant-dir>");
  process.exit(1);
}

const port = Number(process.env.SMOKE_PORT ?? 3210);
const baseUrl = `http://localhost:${port}`;
// Minimal production env: every optional integration off, so the boot-time
// env validation only demands the core variables. Email sign-up stays off since
// it requires an email client; the sign-up endpoint itself is always served.
const env = {
  ...process.env,
  NODE_ENV: "production",
  NEXT_TELEMETRY_DISABLED: "1",
  DATABASE_URL: databaseUrl,
  BETTER_AUTH_SECRET: randomBytes(32).toString("hex"),
  BETTER_AUTH_URL: baseUrl,
  NEXT_PUBLIC_URL: baseUrl,
  NEXT_PUBLIC_SAAS_NAME: "Smoke Test",
  NEXT_PUBLIC_AUTH_EMAIL: "false",
  NEXT_PUBLIC_CMS: "postgres",
  NEXT_PUBLIC_EMAIL_CLIENT: "none",
  NEXT_PUBLIC_IMAGE_STORAGE: "none",
  NEXT_PUBLIC_ALLOW_RATE_LIMIT: "none",
};

function step(label, command, args, cwd = variantDir) {
  console.log(`\n▶ ${label}`);
  const result = spawnSync(command, args, { cwd, env, stdio: "inherit" });
  if (result.status !== 0) {
    console.error(`✗ ${label} failed`);
    process.exit(1);
  }
}

async function waitForServer(server, timeoutMs = 120_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (server.exitCode !== null) throw new Error(`next start exited with ${server.exitCode}`);
    try {
      const response = await fetch(`${baseUrl}/api/auth/ok`);
      if (response.ok) return;
    } catch {
      // Not listening yet.
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  throw new Error(`Server did not answer on ${baseUrl} within ${timeoutMs / 1000}s`);
}

async function signUp() {
  const email = `smoke-${Date.now()}@example.com`;
  const response = await fetch(`${baseUrl}/api/auth/sign-up/email`, {
    method: "POST",
    headers: { "content-type": "application/json", origin: baseUrl },
    body: JSON.stringify({ email, password: "Smoke-test-password-1", name: "Smoke Test" }),
  });
  const body = await response.text();
  if (!response.ok || !body.includes(email)) {
    throw new Error(`Sign-up returned ${response.status}: ${body.slice(0, 500)}`);
  }
  console.log(`✓ Signed up ${email}`);
}

step("prisma generate", "pnpm", ["generate"]);
step("migrate", "pnpm", ["--dir", "packages/database", "run", "migrate:deploy"]);
// Exit code 2 means the migrated database differs from the variant's schema.
step("schema drift check", "pnpm", ["--dir", "packages/database", "exec", "prisma", "migrate", "diff", "--from-config-datasource", "--to-schema", "prisma", "--exit-code"]);
step("seed", "pnpm", ["seed"]);
step("web build", "pnpm", ["--dir", "apps/web", "build"]);

console.log(`\n▶ next start on ${baseUrl}`);
const server = spawn("pnpm", ["--dir", "apps/web", "exec", "next", "start", "-p", String(port)], {
  cwd: variantDir,
  env,
  stdio: "inherit",
  detached: true,
});

let failed = false;
try {
  await waitForServer(server);
  await signUp();
} catch (error) {
  failed = true;
  console.error(`✗ ${error.message}`);
} finally {
  // Kill the whole process group: pnpm -> next -> worker processes.
  try {
    process.kill(-server.pid, "SIGTERM");
  } catch {
    // Already gone.
  }
}

process.exit(failed ? 1 : 0);
