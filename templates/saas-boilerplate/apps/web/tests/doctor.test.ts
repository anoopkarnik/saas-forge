// @vitest-environment node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it, vi } from "vitest";
import { findServerEnvIssues } from "@/lib/env";

type Check = { group: string; id: string; status: "ok" | "warn" | "fail"; message: string };
type Probe = { id: string; label: string; keys: string[]; userHost: boolean; run: () => Promise<unknown> };
type Io = {
  log: (line: string) => void;
  ask: (question: string, options?: { secret?: boolean }) => Promise<string>;
  confirm: (question: string, defaultYes: boolean) => Promise<boolean>;
  exec: (command: string, args: string[], cwd: string) => void;
};
type DoctorOptions = {
  root: string;
  processEnv: Record<string, string>;
  io: Io;
  probes?: false | ((env: Record<string, string>) => Probe[]);
  isTTY?: boolean;
};

// scripts/ is plain JavaScript run by Node, so it is loaded by path, untyped.
const scripts = (file: string) => fileURLToPath(new URL(`../../../scripts/${file}`, import.meta.url));
const doctor = (await import(/* @vite-ignore */ scripts("doctor.mjs"))) as {
  runDoctor: (argv: string[], options: DoctorOptions) => Promise<number>;
  loadProject: (root: string, processEnv: Record<string, string>) => { env: Record<string, string> };
  diagnose: (project: unknown, options: { probes: false }) => Promise<{ ok: boolean; checks: Check[] }>;
  parseEnv: (content: string) => Record<string, string>;
  setEnvValues: (content: string, values: Record<string, string>) => string;
};
const probes = (await import(/* @vite-ignore */ scripts("doctor-probes.mjs"))) as {
  activeProbes: (env: Record<string, string>, context: { root: string; fetchImpl: typeof fetch }) => Probe[];
  runProbe: (probe: Probe) => Promise<{ status: string; message: string }>;
  explainPostgresError: (error: unknown, url: string) => string;
};

const WEB_EXAMPLE = [
  "NEXT_PUBLIC_URL=http://localhost:3000",
  "NEXT_PUBLIC_AUTH_EMAIL=false",
  "BETTER_AUTH_SECRET=change-me-before-production",
  "# Postgres",
  "DATABASE_URL=",
  "NEXT_PUBLIC_ALLOW_RATE_LIMIT=upstash",
  "UPSTASH_REDIS_REST_URL=",
  "UPSTASH_REDIS_REST_TOKEN=",
  "",
].join("\n");

const DATABASE_URL = "postgresql://app:db-password-1@localhost:5432/app";
const STRONG_SECRET = "s".repeat(44);

function makeProject(files: Record<string, string>) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "doctor-"));
  for (const [rel, content] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(root, rel)), { recursive: true });
    fs.writeFileSync(path.join(root, rel), content);
  }
  return root;
}

const read = (root: string, rel: string) => fs.readFileSync(path.join(root, rel), "utf-8");

/** Answers prompts by the key they name, in order. */
function fakeIo(answers: Record<string, string[]> = {}) {
  const lines: string[] = [];
  const io: Io = {
    log: (line) => lines.push(line),
    ask: vi.fn(async (question: string) => {
      const key = Object.keys(answers).find((name) => question.includes(`${name} `));
      return key ? answers[key]!.shift() ?? "" : "";
    }),
    confirm: vi.fn(async () => true),
    exec: vi.fn(),
  };
  return { io, output: () => lines.join("\n") };
}

describe("pnpm doctor", () => {
  it("reports the same missing values as boot validation", async () => {
    const root = makeProject({ "apps/web/.env.example": WEB_EXAMPLE });
    const project = doctor.loadProject(root, {});
    const report = await doctor.diagnose(project, { probes: false });

    const failing = report.checks.filter((check) => check.group === "env" && check.status === "fail");
    expect(failing.map((check) => check.id)).toEqual(findServerEnvIssues(project.env).map((issue) => issue.key));
    expect(failing.map((check) => check.id)).toEqual(
      expect.arrayContaining(["DATABASE_URL", "BETTER_AUTH_SECRET", "UPSTASH_REDIS_REST_URL"]),
    );
  });

  it("--check fails on a placeholder BETTER_AUTH_SECRET and passes once it is fixed", async () => {
    const env = (secret: string) =>
      doctor.setEnvValues(WEB_EXAMPLE, {
        BETTER_AUTH_SECRET: secret,
        DATABASE_URL,
        UPSTASH_REDIS_REST_URL: "https://eu1-example.upstash.io",
        UPSTASH_REDIS_REST_TOKEN: "upstash-token-1",
      });
    const root = makeProject({
      "apps/web/.env": env("change-me-before-production"),
      "packages/database/.env": `DATABASE_URL=${DATABASE_URL}\n`,
    });
    const run = () => doctor.runDoctor(["--check"], { root, processEnv: {}, io: fakeIo().io, probes: false });

    expect(await run()).toBe(1);
    fs.writeFileSync(path.join(root, "apps/web/.env"), env(STRONG_SECRET));
    expect(await run()).toBe(0);
  });

  it("asks for values, generates the secret and writes every env file in one pass", async () => {
    const root = makeProject({
      "apps/web/.env.example": WEB_EXAMPLE,
      "packages/database/.env.example": 'DATABASE_URL=""\n',
      "apps/mobile/.env.example": "EXPO_PUBLIC_API_URL=http://localhost:3000\nEXPO_PUBLIC_AUTH_EMAIL=true\n",
      "apps/desktop/.env.example": 'VITE_API_URL="http://localhost:3000"\nVITE_THEME=orange\n',
      "apps/desktop/.env": 'VITE_API_URL="http://localhost:9999"\n',
    });
    fs.chmodSync(path.join(root, "apps/desktop/.env"), 0o644);
    const { io, output } = fakeIo({
      // The first database URL is not a Postgres URL, so the doctor asks again.
      DATABASE_URL: ["mysql://app@localhost/app", DATABASE_URL],
      UPSTASH_REDIS_REST_URL: ["https://eu1-example.upstash.io"],
      UPSTASH_REDIS_REST_TOKEN: ["upstash-token-1"],
    });

    const code = await doctor.runDoctor([], { root, processEnv: {}, io, probes: false, isTTY: true });

    expect(code).toBe(0);
    const web = doctor.parseEnv(read(root, "apps/web/.env"));
    expect(web.DATABASE_URL).toBe(DATABASE_URL);
    expect(web.UPSTASH_REDIS_REST_TOKEN).toBe("upstash-token-1");
    expect(web.BETTER_AUTH_SECRET).not.toBe("change-me-before-production");
    expect(findServerEnvIssues(web)).toEqual([]);
    expect(read(root, "apps/web/.env")).toContain("# Postgres");
    expect(doctor.parseEnv(read(root, "packages/database/.env")).DATABASE_URL).toBe(DATABASE_URL);
    expect(doctor.parseEnv(read(root, "apps/mobile/.env"))).toMatchObject({
      EXPO_PUBLIC_API_URL: "http://localhost:3000",
      EXPO_PUBLIC_AUTH_EMAIL: "false",
    });
    expect(read(root, "apps/desktop/.env")).toContain('VITE_API_URL="http://localhost:3000"');
    // Env files hold secrets: owner-only, including files that already existed.
    for (const file of ["apps/web/.env", "packages/database/.env", "apps/desktop/.env"]) {
      expect(fs.statSync(path.join(root, file)).mode & 0o777).toBe(0o600);
    }
    expect(output()).toContain("must be a postgresql:// URL");
    for (const secret of ["db-password-1", "upstash-token-1", web.BETTER_AUTH_SECRET!]) {
      expect(output()).not.toContain(secret);
    }
  });

  it("keeps a different DATABASE_URL for migrations and reports it", async () => {
    const root = makeProject({
      "apps/web/.env": doctor.setEnvValues(WEB_EXAMPLE, { BETTER_AUTH_SECRET: STRONG_SECRET, DATABASE_URL }),
      "packages/database/.env": "DATABASE_URL=postgresql://app:db-password-1@direct.example.com:5432/app\n",
    });
    const report = await doctor.diagnose(doctor.loadProject(root, {}), { probes: false });
    const database = report.checks.find((check) => check.id === "packages/database/.env");
    expect(database).toMatchObject({ status: "warn" });
    expect(database!.message).toContain("direct.example.com:5432/app");
    expect(database!.message).not.toContain("db-password-1");
  });

  it("never prints a secret, even when a service echoes it", async () => {
    const root = makeProject({
      "apps/web/.env": doctor.setEnvValues(WEB_EXAMPLE, {
        BETTER_AUTH_SECRET: STRONG_SECRET,
        DATABASE_URL,
        UPSTASH_REDIS_REST_URL: "https://eu1-example.upstash.io",
        UPSTASH_REDIS_REST_TOKEN: "upstash-token-1",
      }),
      "packages/database/.env": `DATABASE_URL=${DATABASE_URL}\n`,
    });
    const echo: Probe = {
      id: "upstash",
      label: "Upstash Redis",
      keys: ["UPSTASH_REDIS_REST_TOKEN"],
      userHost: false,
      run: async () => ({ status: "fail", message: "rejected upstash-token-1 and db-password-1" }),
    };
    const { io, output } = fakeIo();

    expect(await doctor.runDoctor(["--json"], { root, processEnv: {}, io, probes: () => [echo] })).toBe(1);
    expect(output()).toContain("rejected **** and ****");
    expect(output()).not.toContain(STRONG_SECRET);
  });
});

describe("doctor probes", () => {
  const env = {
    DATABASE_URL: "",
    NEXT_PUBLIC_ALLOW_RATE_LIMIT: "upstash",
    UPSTASH_REDIS_REST_URL: "https://eu1-example.upstash.io",
    UPSTASH_REDIS_REST_TOKEN: "upstash-token-1",
    NEXT_PUBLIC_EMAIL_CLIENT: "resend",
    RESEND_API_KEY: "re_123",
    NEXT_PUBLIC_SUPPORT_MAIL: "hi@example.com",
  };
  const respond = (status: number, body: unknown) =>
    vi.fn(async () => new Response(JSON.stringify(body), { status })) as unknown as typeof fetch;
  const run = (id: string, fetchImpl: typeof fetch, overrides: Record<string, string> = {}) => {
    const probe = probes.activeProbes({ ...env, ...overrides }, { root: "/nowhere", fetchImpl }).find((entry) => entry.id === id);
    return probes.runProbe(probe!);
  };

  it("checks Upstash with PING", async () => {
    expect(await run("upstash", respond(200, { result: "PONG" }))).toMatchObject({ status: "ok" });
    expect(await run("upstash", respond(401, {}))).toMatchObject({ status: "fail" });
  });

  it("checks the Resend sending domain", async () => {
    const domains = (status: string) => respond(200, { data: [{ name: "example.com", status }] });
    expect(await run("resend", domains("verified"))).toMatchObject({ status: "ok" });
    expect(await run("resend", domains("pending"))).toMatchObject({ status: "warn" });
    expect(await run("resend", respond(401, { message: "This API key is restricted to only send emails" }))).toMatchObject({
      status: "warn",
    });
    expect(await run("resend", respond(401, { message: "API key is invalid" }))).toMatchObject({ status: "fail" });
  });

  it("fails on a typo in a host the user entered, but only warns when a provider is unreachable", async () => {
    const offline = (code: string) =>
      vi.fn(async () => {
        throw Object.assign(new TypeError("fetch failed"), { cause: { code, hostname: "eu1-exampel.upstash.io" } });
      }) as unknown as typeof fetch;
    expect(await run("upstash", offline("ENOTFOUND"))).toMatchObject({ status: "fail" });
    expect(await run("resend", offline("ENOTFOUND"))).toMatchObject({ status: "warn" });
  });

  // scaffold:begin billing
  it("points local Stripe setups at stripe listen", async () => {
    const result = await run("stripe", respond(200, { id: "acct_1" }), {
      NEXT_PUBLIC_PAYMENT_GATEWAY: "stripe",
      STRIPE_SECRET_KEY: "sk_test_1",
      NEXT_PUBLIC_URL: "http://localhost:3000",
    });
    expect(result.status).toBe("ok");
    expect(result.message).toContain("stripe listen --forward-to localhost:3000/api/payments/stripe/webhook");
  });
  // scaffold:end billing

  it.each([
    [{ code: "28P01" }, /Password authentication failed for user "app"/],
    [{ code: "ENOTFOUND" }, /Host not found: db\.example\.com/],
    [{ code: "ECONNREFUSED" }, /Nothing accepts connections at db\.example\.com:5432/],
    [{ code: "3D000" }, /Database "app" does not exist/],
    [{ message: "Connection terminated due to connection timeout" }, /Timed out connecting/],
  ])("explains Postgres error %o", (error, expected) => {
    expect(probes.explainPostgresError(error, "postgresql://app:pw@db.example.com/app")).toMatch(expected);
  });
});
