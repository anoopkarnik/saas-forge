/**
 * Which scaffold env values are secrets. The single source for the server
 * (rejects them with 400 secret_not_accepted, strips them from saved configs)
 * and for clients (keep them on the device and add them to the ZIP locally).
 */

/** Known secret/credential env keys from the download schema. */
export const SECRET_ENV_KEYS: ReadonlySet<string> = new Set([
  "DATABASE_URL",
  "BETTER_AUTH_SECRET",
  "AUTH_LINKEDIN_CLIENT_ID",
  "AUTH_LINKEDIN_CLIENT_SECRET",
  "AUTH_GITHUB_CLIENT_ID",
  "AUTH_GITHUB_CLIENT_SECRET",
  "AUTH_GOOGLE_CLIENT_ID",
  "AUTH_GOOGLE_CLIENT_SECRET",
  "RESEND_API_KEY",
  "UPSTASH_REDIS_REST_URL",
  "UPSTASH_REDIS_REST_TOKEN",
  "BLOB_READ_WRITE_TOKEN",
  "R2_ACCOUNT_ID",
  "R2_ACCESS_KEY_ID",
  "R2_SECRET_ACCESS_KEY",
  "R2_BUCKET_NAME",
  "BETTERSTACK_TELEMETRY_SOURCE_TOKEN",
  "BETTERSTACK_TELEMETRY_INGESTING_HOST",
  "GA4_PROPERTY_ID",
  "GA4_CREDENTIALS_JSON",
  "GOOGLE_PAGESPEED_API_KEY",
  "AI_GATEWAY_API_KEY",
  "OPENAI_API_KEY",
  "ANTHROPIC_API_KEY",
  "GOOGLE_GENERATIVE_AI_API_KEY",
  "OPENROUTER_API_KEY",
  "OLLAMA_BASE_URL",
  "OPENAI_COMPATIBLE_BASE_URL",
  "N8N_WEBHOOK_URL",
  "N8N_WEBHOOK_JWT_KEY",
  "DODO_PAYMENTS_API_KEY",
  "DODO_PAYMENTS_WEBHOOK_KEY",
  "DODO_PAYMENTS_RETURN_URL",
  "DODO_CREDITS_PRODUCT_ID",
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "INNGEST_EVENT_KEY",
  "INNGEST_SIGNING_KEY",
]);

/** Fail-closed heuristic for keys not in the explicit list. */
const SECRET_PATTERN =
  /(SECRET|PASSWORD|CREDENTIAL|PRIVATE|_TOKEN|_API_KEY|CLIENT_ID|CLIENT_SECRET|DATABASE_URL|WEBHOOK_KEY|JWT)/i;

export function isSecretEnvKey(key: string): boolean {
  // NEXT_PUBLIC_* is browser-exposed by definition, so never a secret.
  if (key.startsWith("NEXT_PUBLIC_")) return false;
  if (SECRET_ENV_KEYS.has(key)) return true;
  return SECRET_PATTERN.test(key);
}

/** Splits wizard env vars into what may be sent to the server and what may not. */
export function splitSecretEnv(envVars: Record<string, string>): {
  publicEnv: Record<string, string>;
  secrets: Record<string, string>;
} {
  const publicEnv: Record<string, string> = {};
  const secrets: Record<string, string> = {};
  for (const [key, value] of Object.entries(envVars)) {
    if (isSecretEnvKey(key)) secrets[key] = value;
    else publicEnv[key] = value;
  }
  return { publicEnv, secrets };
}

/**
 * Env files that carry a buyer's secrets inside the downloaded ZIP, written
 * on the device. Next.js reads apps/web/.env.local over .env; the Prisma CLI
 * reads only packages/database/.env, which the server never writes.
 */
export function secretEnvFiles(
  projectName: string,
  secrets: Record<string, string>,
): Array<{ name: string; content: string }> {
  const entries = Object.entries(secrets);
  if (entries.length === 0) return [];

  const quote = (value: string) => JSON.stringify(value);
  const files = [
    {
      name: `${projectName}/apps/web/.env.local`,
      content:
        "# Added in your browser; these values never reached the SaaS Forge servers.\n" +
        entries.map(([key, value]) => `${key}=${quote(value)}`).join("\n") +
        "\n",
    },
  ];
  if (secrets.DATABASE_URL) {
    files.push({
      name: `${projectName}/packages/database/.env`,
      content: `DATABASE_URL=${quote(secrets.DATABASE_URL)}\n`,
    });
  }
  return files;
}
