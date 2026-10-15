import { buildLaunchpadTasks, projectEnvKeys } from "./catalog";
import { settingHint } from "./env-guidance";
import { buildCuratedTasks } from "./curated";
import type {
  CoverageRequirement,
  DeploymentPath,
  LaunchpadProject,
  SourcePack,
  StageId,
} from "./types";

export const SOURCE_PACK_VERSION = "launchpad-6";
const COMMAND_LABELS: Record<string, string> = {
  "pnpm install": "Install project dependencies",
  "pnpm generate": "Generate the database client",
  "pnpm migrate": "Apply development database migrations",
  "pnpm --dir apps/web dev": "Start the local web app",
  "pnpm doctor": "Review local configuration interactively",
  "pnpm lint": "Check code style",
  "pnpm --dir apps/web typecheck": "Check web types",
  "pnpm test": "Check automated tests",
  "pnpm --dir apps/web build": "Build the web app",
  "pnpm --dir apps/desktop dev": "Start the desktop client",
  "pnpm --dir apps/mobile start": "Start the mobile development server",
};
const PROVIDERS: Record<string, string[]> = {
  NEXT_PUBLIC_PAYMENT_GATEWAY: ["stripe", "dodo", "none"],
  NEXT_PUBLIC_IMAGE_STORAGE: ["vercel_blob", "cloudflare_r2", "none"],
  NEXT_PUBLIC_CMS: ["postgres", "contentful", "none"],
  NEXT_PUBLIC_EMAIL_CLIENT: ["resend", "none"],
  NEXT_PUBLIC_ALLOW_RATE_LIMIT: ["upstash", "none"],
};

/** Bundled guide evidence: contains names and approved examples, never env values. */
export function buildSourcePack(
  project: LaunchpadProject,
  deployment: DeploymentPath,
  stage: StageId,
  completedAnchors: string[] = [],
): SourcePack {
  const tasks = buildLaunchpadTasks(project, deployment).filter(
    (task) => task.stage === stage,
  );
  const envKeys = [
    ...new Set([
      ...projectEnvKeys(project),
      ...(project.platforms.includes("desktop") ? ["VITE_API_URL"] : []),
      ...(project.platforms.includes("mobile") ? ["EXPO_PUBLIC_API_URL"] : []),
    ]),
  ];
  const coverageRequirements: CoverageRequirement[] = [];
  const accounts = tasks.find((task) => task.id === "local.accounts");
  for (const line of accounts?.presentations.developer ?? []) {
    const name = /^Provision or connect (.*?);/.exec(line)?.[1];
    if (!name) continue;
    const terms = name.includes("AI model provider")
      ? ["AI", "provider"]
      : name.includes("OAuth")
        ? [name.split(" ")[0]!, "OAuth"]
        : name.includes("Cloudflare")
          ? ["Cloudflare", "R2"]
          : [name.split(" ")[0]!];
    coverageRequirements.push({
      id:
        "account:" +
        name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/-$/, ""),
      anchorId: "local.accounts",
      kind: "account",
      title: name,
      terms,
      optional:
        name.includes("Python service hosting") ||
        (name.includes("Inngest") && !project.modules.includes("ai_agents")),
    });
  }
  if (stage === "local" || stage === "launch") {
    for (const key of envKeys) {
      const native =
        key === "VITE_API_URL"
          ? "desktop.run"
          : key === "EXPO_PUBLIC_API_URL"
            ? "mobile.run"
            : null;
      if (native && stage !== "local") continue;
      coverageRequirements.push({
        id: "env:" + key,
        anchorId: native ?? `${stage}.environment`,
        kind: "environment",
        title: key,
        terms: [key],
        optional:
          [
            "OPENAI_API_KEY",
            "ANTHROPIC_API_KEY",
            "GOOGLE_GENERATIVE_AI_API_KEY",
            "OPENROUTER_API_KEY",
            "AI_GATEWAY_API_KEY",
            "OLLAMA_BASE_URL",
            "OPENAI_COMPATIBLE_BASE_URL",
            "N8N_WEBHOOK_URL",
            "N8N_WEBHOOK_JWT_KEY",
          ].includes(key) ||
          (["INNGEST_EVENT_KEY", "INNGEST_SIGNING_KEY"].includes(key) &&
            !project.modules.includes("ai_agents")),
      });
    }
  }
  const sources: SourcePack["sources"] = tasks.map((task) => ({
    id: `source:${task.id}`,
    label: task.title,
    excerpt: [
      task.purpose,
      ...task.presentations.developer,
      "Expected result:",
      ...task.acceptance,
      task.verification,
      ...task.fixes,
    ].join("\n"),
  }));
  const curated = buildCuratedTasks(project, deployment).filter(
    (task) => task.stage === stage,
  );
  for (const task of curated.filter((task) => task.id.startsWith("curated:")))
    sources.push({
      id: task.id,
      label: task.title,
      excerpt: [
        task.purpose,
        ...task.presentations.builder,
        ...task.acceptance,
        ...task.fixes,
      ].join("\n"),
    });
  const references = [
    ...new Map(
      curated.flatMap((task) => task.links).map((link) => [link.url, link]),
    ).values(),
  ];
  for (const [index, link] of references.entries())
    sources.push({
      id: `curated-reference:${index}`,
      label: link.label,
      url: link.url,
      excerpt:
        "Official reference for the curated task. The starter-specific instructions are bundled separately; this page is not fetched during task help.",
    });
  if (stage === "local" && project.modules.includes("ai_agents"))
    sources.push({
      id: "curated:backend-origin",
      label: "Starter Python development address",
      url: "http://localhost:8000",
      excerpt:
        "The downloaded starter normally starts the Python API on this address. The terminal output is authoritative if its port changes.",
    });
  if (coverageRequirements.length)
    sources.push({
      id: "starter:environment-settings",
      label: "Environment setting locations and applicability",
      excerpt:
        envKeys.map((key) => `${key}: ${settingHint(key)}`).join("\n") +
        "\nOptional settings must be explained, not silently omitted or required when inactive. " +
        "Configure only the AI providers you choose; leave other provider credentials blank. " +
        "Python hosting is unnecessary for running locally. AI agent jobs use Inngest even when general jobs use inline execution. " +
        "Environment settings belong in the app's local environment file or the production host's environment settings.",
    });
  for (const task of tasks)
    for (const [index, link] of task.links.entries())
      sources.push({
        id: `reference:${task.id}:${index}`,
        label: link.label,
        url: link.url,
        excerpt: `Official reference for ${task.title}. Use the bundled task guidance; do not assume this page has been fetched.`,
      });
  sources.push({
    id: "starter:workflow",
    label: "Starter setup workflow",
    excerpt:
      "The current starter package.json requires Node 24 or newer and pnpm 10.4.1; verify the downloaded version before installation. Install dependencies from the downloaded project root. Use the supplied app-specific .env.example files. Generate the Prisma client, apply migrations after reviewing their effect on data, then start development. Never reset an existing database to troubleshoot setup. Never paste credentials into AI help. Companion Python, Electron, and Expo apps run separately when selected.",
  });
  if (tasks.some((task) => task.checkId || task.id === "local.doctor"))
    sources.push({
      id: "starter:doctor-report",
      label: "Doctor report and Launchpad check results",
      excerpt:
        "Doctor JSON has a checks array. Each check contains group, id and status. Service checks have group services and an applicable service id such as postgres. Status values are ok, warn and fail; ok is the passing value, never pass. Prefer importing launchpad-report.json into Launchpad under the user-selected Local or Production environment, then checking the visible Passed imported check, Warning or Failed status. The JSON does not establish an environment by itself. Missing checks remain Not checked; local reports cannot verify production. A passing connection probe does not verify application workflows, backups or restores. Database network access should allow only the owner's required IP addresses, never an unrestricted all-IP network.",
    });
  // Curated starter facts are bundled here; ordinary tRPC never reads template files.
  if (stage === "local")
    sources.push({
      id: "starter:local-url",
      label: "Default development web address",
      url: "http://localhost:3000",
      excerpt:
        "apps/web/.env.example sets NEXT_PUBLIC_URL to http://localhost:3000. Use the development server's printed address if its port changes.",
    });
  if (stage === "mvp") {
    const customization = sources.find(
      (source) => source.id === "source:mvp.customize",
    );
    if (customization)
      customization.excerpt +=
        "\nStarter customization locations: apps/web/app/(home)/page.tsx is the authenticated example dashboard; apps/web/components/home/AppSidebar.tsx defines app navigation; apps/web/app/landing/page.tsx is the marketing entry; apps/web/lib/site-config/registry.ts declares configurable brand and site settings, with owner administration at /admin/settings. Update support contact and the privacy and terms pages under apps/web/app/landing/legal. Build product data models in packages/database/prisma and server procedures in apps/web/trpc/routers using server authorization. New features need user-written implementation; these paths do not imply the starter already implements the customer's product.";
  }
  const paths = new Set([
    "README.md",
    "AGENTS.md",
    "SETUP.md",
    ".env",
    ".env.example",
    "package.json",
    "pnpm-lock.yaml",
    "launchpad-report.json",
    "apps/web",
    "packages/database",
    "apps/web/.env",
    "apps/web/.env.example",
    "packages/database/.env",
    "packages/database/.env.example",
    "packages/database/prisma",
    "docker-compose.yml",
  ]);
  if (stage === "mvp")
    for (const path of [
      "apps/web/app/(home)/page.tsx",
      "apps/web/components/home/AppSidebar.tsx",
      "apps/web/app/landing/page.tsx",
      "apps/web/lib/site-config/registry.ts",
      "apps/web/app/landing/legal",
      "apps/web/app/landing/legal/privacy-policy/page.tsx",
      "apps/web/app/landing/legal/terms-of-service/page.tsx",
      "apps/web/trpc/routers",
      "/admin/settings",
    ])
      paths.add(path);
  if (project.platforms.includes("desktop"))
    for (const path of [
      "apps/desktop",
      "apps/desktop/.env",
      "apps/desktop/.env.example",
      "apps/desktop/package.json",
    ])
      paths.add(path);
  if (project.platforms.includes("mobile"))
    for (const path of [
      "apps/mobile",
      "apps/mobile/.env",
      "apps/mobile/.env.example",
      "apps/mobile/app.json",
      "apps/mobile/package.json",
    ])
      paths.add(path);
  if (project.modules.includes("ai_agents"))
    for (const path of [
      "apps/backend",
      "apps/backend/.env",
      "apps/backend/.env.example",
      "apps/backend/README.md",
      "apps/backend/pyproject.toml",
    ])
      paths.add(path);
  for (const source of sources)
    for (const match of source.excerpt.matchAll(
      /\b(?:apps|packages|scripts|\.github)\/[A-Za-z0-9_./[\]-]+/g,
    ))
      paths.add(match[0].replace(/[.]$/, ""));
  for (const source of sources)
    for (const match of source.excerpt.matchAll(
      /(?<![\w:])\/(?:api|admin|auth|landing|projects)(?:\/[A-Za-z0-9_()[\].-]+)+/g,
    ))
      paths.add(match[0].replace(/[.]$/, ""));
  const providers = Object.fromEntries(
    Object.entries(PROVIDERS).flatMap(([key, values]) =>
      typeof project.config[key] === "string" &&
      values.includes(project.config[key] as string)
        ? [[key, project.config[key] as string]]
        : [],
    ),
  );
  return {
    version: SOURCE_PACK_VERSION,
    stage,
    project: {
      modules: project.modules,
      platforms: project.platforms,
      providers,
      templateVersion: project.templateVersion,
      deployment,
    },
    anchors: tasks.map((task) => ({
      id: task.id,
      title: task.title,
      purpose: task.purpose,
      instructions: task.presentations.developer,
      acceptance: task.acceptance,
      verification: task.verification,
      fixes: task.fixes,
      sourceIds: [
        `source:${task.id}`,
        "starter:workflow",
        ...task.links.map((_, index) => `reference:${task.id}:${index}`),
      ],
    })),
    sources,
    paths: [...paths].sort(),
    envKeys,
    coverageRequirements,
    completedRequirements: [],
    completedAnchors,
    serverCheckAnchors: tasks
      .filter((task) => task.checkId)
      .map((task) => task.id),
    commands: tasks.flatMap((task) =>
      task.commands.map((command, index) => ({
        id: `command:${task.id}:${index}`,
        ...command,
        label: COMMAND_LABELS[command.command] ?? command.label,
      })),
    ),
  };
}
