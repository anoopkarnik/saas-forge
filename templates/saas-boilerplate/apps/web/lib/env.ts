// Boot-time validation of the web server environment. `instrumentation.ts`
// calls `assertServerEnv()` once per server process: production refuses to
// start on any issue, other environments only warn so partially configured
// local setups keep working.

type Env = Record<string, string | undefined>;

export type ServerEnvIssue = { key: string; message: string };

// Values shipped in .env.example files and docker-compose.yml for local
// development. They are public, so a production deploy must never use them.
const DEV_PLACEHOLDER_SECRETS = new Set([
  "change-me-before-production",
  "dev-only-change-me-32bytes-hex0000",
]);

const MIN_SECRET_LENGTH = 32;

// NEXT_PUBLIC_ variables are inlined into the browser bundle, so a name that
// looks like a credential is a secret classified as public by mistake.
export const SECRET_NAME_PATTERN = /SECRET|TOKEN|PASSWORD|PRIVATE|API_KEY|WEBHOOK_KEY|JWT_KEY/;

// Integration toggles and the server credentials their code paths read.
const INTEGRATION_REQUIREMENTS: Array<{
  toggle: string;
  value: string;
  keys: string[];
}> = [
  { toggle: "NEXT_PUBLIC_AUTH_GOOGLE", value: "true", keys: ["AUTH_GOOGLE_CLIENT_ID", "AUTH_GOOGLE_CLIENT_SECRET"] },
  { toggle: "NEXT_PUBLIC_AUTH_GITHUB", value: "true", keys: ["AUTH_GITHUB_CLIENT_ID", "AUTH_GITHUB_CLIENT_SECRET"] },
  { toggle: "NEXT_PUBLIC_AUTH_LINKEDIN", value: "true", keys: ["AUTH_LINKEDIN_CLIENT_ID", "AUTH_LINKEDIN_CLIENT_SECRET"] },
  { toggle: "NEXT_PUBLIC_EMAIL_CLIENT", value: "resend", keys: ["RESEND_API_KEY", "NEXT_PUBLIC_SUPPORT_MAIL"] },
  // scaffold:begin payment_gateway.stripe
  { toggle: "NEXT_PUBLIC_PAYMENT_GATEWAY", value: "stripe", keys: ["STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET"] },
  // scaffold:end payment_gateway.stripe
  // scaffold:begin payment_gateway.dodo
  { toggle: "NEXT_PUBLIC_PAYMENT_GATEWAY", value: "dodo", keys: ["DODO_PAYMENTS_API_KEY", "DODO_PAYMENTS_WEBHOOK_KEY"] },
  // scaffold:end payment_gateway.dodo
  // scaffold:begin image_storage.vercel_blob
  { toggle: "NEXT_PUBLIC_IMAGE_STORAGE", value: "vercel_blob", keys: ["BLOB_READ_WRITE_TOKEN"] },
  // scaffold:end image_storage.vercel_blob
  // scaffold:begin image_storage.cloudflare_r2
  {
    toggle: "NEXT_PUBLIC_IMAGE_STORAGE",
    value: "cloudflare_r2",
    keys: ["R2_ACCOUNT_ID", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_BUCKET_NAME"],
  },
  // scaffold:end image_storage.cloudflare_r2
  { toggle: "NEXT_PUBLIC_ALLOW_RATE_LIMIT", value: "upstash", keys: ["UPSTASH_REDIS_REST_URL", "UPSTASH_REDIS_REST_TOKEN"] },
  // scaffold:begin jobs
  { toggle: "JOBS_DRIVER", value: "inngest", keys: ["INNGEST_EVENT_KEY", "INNGEST_SIGNING_KEY"] },
  // scaffold:end jobs
  // scaffold:begin cms.notion
  { toggle: "NEXT_PUBLIC_CMS", value: "notion", keys: ["NOTION_API_TOKEN"] },
  // scaffold:end cms.notion
];

function isBlank(value: string | undefined): boolean {
  return !value || value.trim() === "";
}

function hasProtocol(value: string, protocols: string[]): boolean {
  try {
    return protocols.includes(new URL(value).protocol);
  } catch {
    return false;
  }
}

function secretIssue(key: string, value: string | undefined): ServerEnvIssue | null {
  if (isBlank(value)) return { key, message: "is required" };
  if (DEV_PLACEHOLDER_SECRETS.has(value!)) {
    return { key, message: "is a public development placeholder; generate one with `openssl rand -base64 32`" };
  }
  if (value!.length < MIN_SECRET_LENGTH) {
    return { key, message: `must be at least ${MIN_SECRET_LENGTH} characters` };
  }
  return null;
}

export function findServerEnvIssues(env: Env): ServerEnvIssue[] {
  const issues: ServerEnvIssue[] = [];

  if (isBlank(env.NEXT_PUBLIC_URL)) {
    issues.push({ key: "NEXT_PUBLIC_URL", message: "is required" });
  } else if (!hasProtocol(env.NEXT_PUBLIC_URL!, ["http:", "https:"])) {
    issues.push({ key: "NEXT_PUBLIC_URL", message: "must be an http(s) URL" });
  }

  if (isBlank(env.DATABASE_URL)) {
    issues.push({ key: "DATABASE_URL", message: "is required" });
  } else if (!hasProtocol(env.DATABASE_URL!, ["postgresql:", "postgres:"])) {
    issues.push({ key: "DATABASE_URL", message: "must be a postgresql:// URL" });
  }

  const authSecretIssue = secretIssue("BETTER_AUTH_SECRET", env.BETTER_AUTH_SECRET);
  if (authSecretIssue) issues.push(authSecretIssue);

  // scaffold:begin ai_agents
  // The FastAPI backend is optional; once BACKEND_URL points at one, every
  // request to it is HMAC-signed with this secret.
  if (!isBlank(env.BACKEND_URL) || !isBlank(env.BACKEND_HMAC_SECRET)) {
    const hmacIssue = secretIssue("BACKEND_HMAC_SECRET", env.BACKEND_HMAC_SECRET);
    if (hmacIssue) issues.push(hmacIssue);
  }
  // scaffold:end ai_agents

  // Email/password sign-up requires a verification email, so it needs a sender.
  if (env.NEXT_PUBLIC_AUTH_EMAIL === "true" && (isBlank(env.NEXT_PUBLIC_EMAIL_CLIENT) || env.NEXT_PUBLIC_EMAIL_CLIENT === "none")) {
    issues.push({
      key: "NEXT_PUBLIC_EMAIL_CLIENT",
      message: "is required when NEXT_PUBLIC_AUTH_EMAIL=true (sign-up sends a verification email)",
    });
  }

  for (const { toggle, value, keys } of INTEGRATION_REQUIREMENTS) {
    if (env[toggle] !== value) continue;
    for (const key of keys) {
      if (isBlank(env[key])) {
        issues.push({ key, message: `is required when ${toggle}=${value}` });
      }
    }
  }

  for (const key of Object.keys(env)) {
    if (key.startsWith("NEXT_PUBLIC_") && SECRET_NAME_PATTERN.test(key) && !isBlank(env[key])) {
      issues.push({ key, message: "looks like a secret but NEXT_PUBLIC_ exposes it to the browser" });
    }
  }

  return issues;
}

export function assertServerEnv(env: Env = process.env): void {
  const issues = findServerEnvIssues(env);
  if (issues.length === 0) return;

  const report = `Invalid server environment:\n${issues
    .map(({ key, message }) => `  - ${key} ${message}`)
    .join("\n")}`;

  if (env.NODE_ENV === "production") {
    throw new Error(report);
  }
  console.warn(`[env] ${report}`);
}
