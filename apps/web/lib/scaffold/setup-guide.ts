import {
  getAccounts,
  resolvePreset,
  type ProductTypeId,
  type TierId,
  type VersionId,
} from "@workspace/ui/lib/constants/presets";
import { getProjectEnvGroups } from "@workspace/ui/lib/scaffold-wizard";
import type { FormValues } from "@workspace/ui/lib/zod/download";
import type { ScaffoldModuleId } from "@/lib/scaffold-modules";

export interface SetupGuideInput {
  name: string;
  productTypeId?: string | null;
  tierId?: string | null;
  versionId?: string | null;
  modules: ScaffoldModuleId[];
  config: Partial<FormValues>;
}

export interface SetupStep {
  title: string;
  details: string[];
}

export interface SetupGuide {
  accounts: string[];
  secrets: string[];
  steps: SetupStep[];
  markdown: string;
}

/** Short "where do I get this" hint per env var. Falls back to a generic line. */
const ENV_HINTS: Record<string, string> = {
  DATABASE_URL: "Postgres connection string from your database provider (Neon, Supabase, Railway).",
  BETTER_AUTH_SECRET: "Generate with `openssl rand -base64 32`.",
  WEBHOOK_SECRET_KEY: "Generate with `openssl rand -base64 32`; keep it, or stored webhook secrets become unreadable.",
  AUTH_GITHUB_CLIENT_ID: "GitHub → Settings → Developer settings → OAuth Apps.",
  AUTH_GITHUB_CLIENT_SECRET: "Same GitHub OAuth App — generate a new client secret.",
  AUTH_GOOGLE_CLIENT_ID: "Google Cloud Console → APIs & Services → Credentials → OAuth client.",
  AUTH_GOOGLE_CLIENT_SECRET: "Same Google OAuth client.",
  AUTH_LINKEDIN_CLIENT_ID: "LinkedIn Developers → your app → Auth.",
  AUTH_LINKEDIN_CLIENT_SECRET: "Same LinkedIn app.",
  RESEND_API_KEY: "Resend → API Keys.",
  NOTION_API_TOKEN: "Notion → Settings → Connections → develop your own integration.",
  UPSTASH_REDIS_REST_URL: "Upstash → your Redis database → REST API.",
  UPSTASH_REDIS_REST_TOKEN: "Upstash → your Redis database → REST API.",
  BLOB_READ_WRITE_TOKEN: "Vercel → Storage → Blob → tokens.",
  R2_ACCESS_KEY_ID: "Cloudflare → R2 → Manage R2 API Tokens.",
  R2_SECRET_ACCESS_KEY: "Cloudflare → R2 → Manage R2 API Tokens.",
  STRIPE_SECRET_KEY: "Stripe → Developers → API keys.",
  STRIPE_WEBHOOK_SECRET: "Stripe → Developers → Webhooks → your endpoint signing secret.",
  DODO_PAYMENTS_API_KEY: "Dodo Payments dashboard → API keys.",
  DODO_PAYMENTS_WEBHOOK_KEY: "Dodo Payments dashboard → Webhooks.",
  OPENAI_API_KEY: "OpenAI Platform → API keys.",
  ANTHROPIC_API_KEY: "Anthropic Console → API keys.",
  GOOGLE_GENERATIVE_AI_API_KEY: "Google AI Studio → Get API key.",
  AI_GATEWAY_API_KEY: "Your AI gateway provider dashboard.",
};

function hintFor(key: string): string {
  return ENV_HINTS[key] ?? "Obtain from the provider dashboard, then add it to apps/web/.env.";
}

function tryResolvePreset(input: SetupGuideInput) {
  if (!input.productTypeId || !input.tierId || !input.versionId) return null;
  try {
    return resolvePreset(
      input.productTypeId as ProductTypeId,
      input.tierId as TierId,
      input.versionId as VersionId,
    );
  } catch {
    return null;
  }
}

/**
 * Builds an env-acquisition guide for a selected project. Prefers the resolved
 * preset (rich steps + cost + delivery); falls back to deriving accounts and
 * secrets directly from the config toggles and selected modules.
 */
export function generateSetupGuide(input: SetupGuideInput): SetupGuide {
  const preset = tryResolvePreset(input);

  const accounts = preset
    ? preset.accountsNeeded
    : getAccounts(input.config, input.modules);
  // Complete list of env vars this exact selection needs — the same fields the
  // wizard no longer collects. This is what the Projects tab shows to fill in.
  const envGroups = getProjectEnvGroups({
    ...(input.config as Record<string, unknown>),
    SELECTED_MODULES: input.modules,
  } as unknown as FormValues);
  const secrets = Array.from(
    new Set(envGroups.flatMap((group) => group.fields)),
  );
  const baseSteps: SetupStep[] = preset
    ? preset.steps
    : [
        {
          title: "Connect the managed foundation",
          details: accounts.map(
            (account) => `Create or connect ${account}, then add its keys to apps/web/.env.`,
          ),
        },
        {
          title: "Fill environment variables",
          details: ["Copy apps/web/.env.example to apps/web/.env and fill each value below."],
        },
        {
          title: "Run the project",
          details: ["pnpm install", "pnpm generate", "pnpm migrate", "pnpm dev"],
        },
      ];
  // The Python service only ships with the ai_agents module.
  const steps: SetupStep[] = input.modules.includes("ai_agents")
    ? [
        ...baseSteps,
        {
          title: "Run the AI agents service (Python)",
          details: [
            "Install uv (https://docs.astral.sh/uv/) and Python 3.12, then run `uv sync` in apps/backend.",
            "Set BACKEND_URL and BACKEND_HMAC_SECRET (`openssl rand -hex 32`) in apps/web/.env; use the same secret for the backend. `pnpm doctor` generates it and copies it to apps/backend/.env.",
            "Postgres needs the pgvector extension for RAG collections.",
            "Start it with `docker compose up backend-api backend-worker`, or follow apps/backend/README.md.",
          ],
        },
      ]
    : baseSteps;

  const markdown = renderMarkdown(input, { accounts, secrets, steps }, preset);
  return { accounts, secrets, steps, markdown };
}

function renderMarkdown(
  input: SetupGuideInput,
  parts: { accounts: string[]; secrets: string[]; steps: SetupStep[] },
  preset: ReturnType<typeof resolvePreset> | null,
): string {
  const lines: string[] = [];
  lines.push(`# Setup guide — ${input.name}`);
  lines.push("");
  lines.push(
    "Run `pnpm install`, then `pnpm doctor`. It asks for each value below, generates secrets, checks every service with a live call, writes the `.env` files and offers to set up the database. The rest of this guide is the same work by hand.",
  );
  lines.push("");
  if (preset) {
    lines.push(`**Blueprint:** ${preset.name} · ${preset.tagline}`);
    lines.push(
      `**Estimated cost:** $${preset.cost.low}–$${preset.cost.high}/mo · **Working launch:** ${preset.delivery.workingLaunch}`,
    );
    lines.push("");
  }
  if (input.modules.length > 0) {
    lines.push(`**Selected modules:** ${input.modules.join(", ")}`);
    lines.push("");
  }

  lines.push("## 1. Accounts to create");
  lines.push("");
  for (const account of parts.accounts) lines.push(`- ${account}`);
  lines.push("");

  lines.push("## 2. Environment variables to fill");
  lines.push("");
  lines.push("Copy `apps/web/.env.example` to `apps/web/.env`, then fill:");
  lines.push("");
  for (const secret of parts.secrets) {
    lines.push(`- \`${secret}\` — ${hintFor(secret)}`);
  }
  lines.push("");

  lines.push("## 3. Steps");
  lines.push("");
  parts.steps.forEach((step, index) => {
    lines.push(`${index + 1}. **${step.title}**`);
    for (const detail of step.details) lines.push(`   - ${detail}`);
  });
  lines.push("");

  return lines.join("\n");
}
