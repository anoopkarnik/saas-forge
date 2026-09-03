/**
 * Secret/credential classification for saved project configs.
 *
 * Saved configs must never persist secret env values — we store only non-secret
 * selections and generate acquisition steps (SETUP.md) instead. This module is
 * platform-only and is excluded from the downloaded boilerplate.
 */

/** Explicit list of known secret/credential env keys from the download schema. */
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
  "NOTION_API_TOKEN",
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
]);

/** Fail-closed heuristic for keys not in the explicit list. */
const SECRET_PATTERN =
  /(SECRET|PASSWORD|CREDENTIAL|PRIVATE|_TOKEN|_API_KEY|CLIENT_ID|CLIENT_SECRET|DATABASE_URL|WEBHOOK_KEY|JWT)/i;

export function isSecretEnvKey(key: string): boolean {
  // NEXT_PUBLIC_* is browser-exposed by definition — never a secret.
  if (key.startsWith("NEXT_PUBLIC_")) return false;
  if (SECRET_ENV_KEYS.has(key)) return true;
  return SECRET_PATTERN.test(key);
}

/**
 * Removes every secret-looking key from a config record, returning the safe
 * subset plus the list of keys that were dropped (for user-facing messaging).
 */
export function stripSecrets<T extends Record<string, unknown>>(
  config: T,
): { config: Partial<T>; strippedKeys: string[] } {
  const clean: Record<string, unknown> = {};
  const strippedKeys: string[] = [];

  for (const [key, value] of Object.entries(config)) {
    if (isSecretEnvKey(key)) {
      strippedKeys.push(key);
      continue;
    }
    clean[key] = value;
  }

  return { config: clean as Partial<T>, strippedKeys };
}
