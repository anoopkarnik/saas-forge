/** Short "where do I get this" hint per env var. Falls back to a generic line. */
const SETTING_DETAILS: Record<string, string> = {
  VITE_API_URL:
    "The desktop client's web API origin. Use the web origin without an /api/trpc suffix.",
  EXPO_PUBLIC_API_URL:
    "The mobile client's reachable web API origin. Physical devices need your computer's LAN address instead of localhost.",
  NEXT_PUBLIC_AUTH_EMAIL:
    "Enable or disable email sign-in to match your selected authentication methods.",
  NEXT_PUBLIC_SUPPORT_MAIL:
    "Your support and email sender address; when sending with Resend, use a sender on your verified domain.",
  R2_ACCOUNT_ID:
    "Cloudflare dashboard → your account ID; use the account containing the selected R2 bucket.",
  R2_BUCKET_NAME:
    "Cloudflare → R2 → select or create the bucket; copy its exact name.",
  NEXT_PUBLIC_R2_PUBLIC_URL:
    "The R2 bucket's configured public development URL or custom domain for serving public uploaded images.",
  DODO_PAYMENTS_RETURN_URL:
    "The app URL customers return to after checkout. Use your local app URL for development and your HTTPS app domain in production.",
  DODO_PAYMENTS_ENVIRONMENT:
    "Dodo's test_mode for development or live_mode for production; match the credentials to that mode.",
  DODO_CREDITS_PRODUCT_ID:
    "The credits product's ID from the Dodo dashboard. Match the product to the chosen test or live environment.",
  NEXT_PUBLIC_DODO_PAYMENTS_URL:
    "The Dodo dashboard base URL used for invoice receipt links. Use its origin, not a product checkout link.",
  NEXT_PUBLIC_ALLOW_RATE_LIMIT:
    "Use your selected rate-limit provider: upstash enables the Redis credentials; none disables this integration.",
  BETTERSTACK_TELEMETRY_SOURCE_TOKEN:
    "BetterStack Logs → your source → source token; keep this credential private.",
  BETTERSTACK_TELEMETRY_INGESTING_HOST:
    "The ingesting host listed for the same BetterStack Logs source, not your app's web address.",
  NEXT_PUBLIC_GOOGLE_ANALYTICS_MEASUREMENT_ID:
    "Google Analytics → your property's web data stream → measurement ID, typically starting with G-.",
  GA4_PROPERTY_ID:
    "Google Analytics → property settings → numeric property ID, distinct from the web measurement ID.",
  GA4_CREDENTIALS_JSON:
    "Private Google service-account JSON for GA4 reports; enable the Analytics Data API and grant that account access to the property.",
  GOOGLE_PAGESPEED_API_KEY:
    "Google Cloud → enable PageSpeed Insights API → create an API key for the selected performance reports.",
  OPENROUTER_API_KEY:
    "OpenRouter → API keys; configure only if you choose this AI provider.",
  OLLAMA_BASE_URL:
    "The reachable API address of your Ollama server, including its API path; leave blank unless you use Ollama.",
  OPENAI_COMPATIBLE_BASE_URL:
    "Your chosen compatible provider's documented API base address; leave blank when using a different provider.",
  N8N_WEBHOOK_URL:
    "Your n8n workflow's active webhook URL; leave blank unless the n8n AI integration is used.",
  N8N_WEBHOOK_JWT_KEY:
    "The private JWT key matching the n8n webhook's authentication; configure together with its webhook URL, otherwise leave blank.",
};

export const ENV_HINTS: Record<string, string> = {
  NEXT_PUBLIC_URL:
    "The web app origin: localhost in development, your HTTPS domain in production.",
  NEXT_PUBLIC_EMAIL_CLIENT:
    "Set to resend only when using Resend; provider credentials remain in your environment.",
  NEXT_PUBLIC_PAYMENT_GATEWAY:
    "Your saved payment provider selection, not a credential.",
  NEXT_PUBLIC_AI_ENABLED:
    "Enable the selected AI module when you have configured a model provider.",
  BACKEND_URL: "The reachable URL of your separately hosted Python API.",
  BACKEND_HMAC_SECRET:
    "Generate with `openssl rand -hex 32`; use the same value in web and backend environments.",
  JOBS_DRIVER:
    "Use inngest for queued jobs; read the jobs guide for inline development behavior.",
  INNGEST_EVENT_KEY: "Inngest dashboard → Manage → Event Keys.",
  INNGEST_SIGNING_KEY: "Inngest dashboard → Manage → Signing Key.",
  DATABASE_URL:
    "Postgres connection string from your database provider (Neon, Supabase, Railway).",
  BETTER_AUTH_SECRET: "Generate with `openssl rand -base64 32`.",
  WEBHOOK_SECRET_KEY:
    "Generate with `openssl rand -base64 32`; keep it, or stored webhook secrets become unreadable.",
  AUTH_GITHUB_CLIENT_ID: "GitHub → Settings → Developer settings → OAuth Apps.",
  AUTH_GITHUB_CLIENT_SECRET:
    "Same GitHub OAuth App — generate a new client secret.",
  AUTH_GOOGLE_CLIENT_ID:
    "Google Cloud Console → APIs & Services → Credentials → OAuth client.",
  AUTH_GOOGLE_CLIENT_SECRET: "Same Google OAuth client.",
  AUTH_LINKEDIN_CLIENT_ID: "LinkedIn Developers → your app → Auth.",
  AUTH_LINKEDIN_CLIENT_SECRET: "Same LinkedIn app.",
  RESEND_API_KEY: "Resend → API Keys.",
  UPSTASH_REDIS_REST_URL: "Upstash → your Redis database → REST API.",
  UPSTASH_REDIS_REST_TOKEN: "Upstash → your Redis database → REST API.",
  BLOB_READ_WRITE_TOKEN: "Vercel → Storage → Blob → tokens.",
  R2_ACCESS_KEY_ID: "Cloudflare → R2 → Manage R2 API Tokens.",
  R2_SECRET_ACCESS_KEY: "Cloudflare → R2 → Manage R2 API Tokens.",
  STRIPE_SECRET_KEY: "Stripe → Developers → API keys.",
  STRIPE_WEBHOOK_SECRET:
    "Stripe → Developers → Webhooks → your endpoint signing secret.",
  DODO_PAYMENTS_API_KEY: "Dodo Payments dashboard → API keys.",
  DODO_PAYMENTS_WEBHOOK_KEY: "Dodo Payments dashboard → Webhooks.",
  OPENAI_API_KEY: "OpenAI Platform → API keys.",
  ANTHROPIC_API_KEY: "Anthropic Console → API keys.",
  GOOGLE_GENERATIVE_AI_API_KEY: "Google AI Studio → Get API key.",
  AI_GATEWAY_API_KEY: "Your AI gateway provider dashboard.",
};

export function envHint(key: string): string {
  return (
    ENV_HINTS[key] ??
    "Obtain from the provider dashboard, then add it to apps/web/.env."
  );
}

/** Additional bundled details do not change existing catalog task signatures/progress. */
export function settingHint(key: string): string {
  return SETTING_DETAILS[key] ?? envHint(key);
}
