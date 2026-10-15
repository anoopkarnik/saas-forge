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
import { renderWalkthroughMarkdown } from "./launchpad/ai-state";
import type { DeploymentPath, GuideMode, LaunchpadState } from "./launchpad/types";

export interface SetupGuideInput {
  launchpadState?: LaunchpadState;
  name: string;
  productTypeId?: string | null;
  tierId?: string | null;
  versionId?: string | null;
  modules: ScaffoldModuleId[];
  config: Partial<FormValues>;
  platforms?: string[];
  templateVersion?: string;
  deployment?: DeploymentPath;
  mode?: GuideMode;
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
            (account) =>
              `Create or connect ${account}, then add its keys to apps/web/.env.`,
          ),
        },
        {
          title: "Fill environment variables",
          details: [
            "Copy apps/web/.env.example to apps/web/.env and fill each value below.",
          ],
        },
        {
          title: "Run the project",
          details: [
            "pnpm install",
            "pnpm generate",
            "pnpm migrate",
            "pnpm dev",
          ],
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
            "Set JOBS_DRIVER=inngest and configure INNGEST_EVENT_KEY and INNGEST_SIGNING_KEY. Sync /api/inngest with Inngest before dispatching AI jobs.",
            "Start it with `docker compose up backend-api`, or follow apps/backend/README.md.",
          ],
        },
      ]
    : baseSteps;

  const platforms = input.platforms ??
    input.config.NEXT_PUBLIC_PLATFORM ?? ["web"];
  const markdown =
    `# Setup guide — ${input.name}\n\nRun \`pnpm install\`, then \`pnpm doctor\` to configure your downloaded project. Follow the applicable Launchpad tasks below from local setup through production operation.\n\n` +
    renderWalkthroughMarkdown(
      {
        name: input.name,
        modules: input.modules,
        platforms,
        templateVersion: input.templateVersion ?? "unknown",
        config: input.config as Record<string, unknown>,
      },
      { ...(input.launchpadState ?? { mode: input.mode ?? "builder", deployment: input.deployment ?? "vercel", manual: {}, reports: {} }), deployment: input.deployment ?? input.launchpadState?.deployment ?? "vercel" },
    );
  return { accounts, secrets, steps, markdown };
}
