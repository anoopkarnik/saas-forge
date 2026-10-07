// Copy of packages/ui/src/lib/scaffold-secrets.ts (mobile does not depend on
// @workspace/ui). apps/web/lib/scaffold/__tests__/secretEnv.test.ts fails if
// the two disagree. Mobile cannot add files to a ZIP, so it never collects
// secrets: buyers add them after download using SETUP.md.

const SECRET_ENV_KEYS = new Set([
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
    "INNGEST_EVENT_KEY",
    "INNGEST_SIGNING_KEY",
]);

const SECRET_PATTERN =
    /(SECRET|PASSWORD|CREDENTIAL|PRIVATE|_TOKEN|_API_KEY|CLIENT_ID|CLIENT_SECRET|DATABASE_URL|WEBHOOK_KEY|JWT)/i;

export function isSecretEnvKey(key: string): boolean {
    if (key.startsWith("NEXT_PUBLIC_")) return false;
    if (SECRET_ENV_KEYS.has(key)) return true;
    return SECRET_PATTERN.test(key);
}
