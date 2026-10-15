import { envHint } from "./env-guidance";
import { getProjectEnvGroups } from "@workspace/ui/lib/scaffold-wizard";
import type { FormValues } from "@workspace/ui/lib/zod/download";
import {
  STAGES,
  type DeploymentPath,
  type GuideMode,
  type LaunchpadProject,
  type LaunchpadTask,
  type StageId,
} from "./types";

/** Defaults retained by the starter's env template when older configs omit a choice. */
export function guideConfig(project: LaunchpadProject): Record<string, unknown> {
  const savedProviders = project.config.NEXT_PUBLIC_AUTH_PROVIDERS;
  const providers = Array.isArray(savedProviders)
    ? savedProviders.filter(
        (value): value is string => typeof value === "string",
      )
    : typeof savedProviders === "string"
      ? savedProviders
          .split(",")
          .map((value) => value.trim())
          .filter(Boolean)
      : (
          [
            ["NEXT_PUBLIC_AUTH_EMAIL", "email_verification"],
            ["NEXT_PUBLIC_AUTH_GOOGLE", "google"],
            ["NEXT_PUBLIC_AUTH_GITHUB", "github"],
            ["NEXT_PUBLIC_AUTH_LINKEDIN", "linkedin"],
          ] as const
        )
          .filter(
            ([key]) =>
              project.config[key] === true || project.config[key] === "true",
          )
          .map(([, provider]) => provider);
  return {
    NEXT_PUBLIC_CMS: "postgres",
    NEXT_PUBLIC_IMAGE_STORAGE: "vercel_blob",
    NEXT_PUBLIC_ALLOW_RATE_LIMIT: "upstash",
    NEXT_PUBLIC_EMAIL_CLIENT: "none",
    ...project.config,
    NEXT_PUBLIC_AUTH_PROVIDERS: providers,
    ...(!project.modules.includes("billing")
      ? { NEXT_PUBLIC_PAYMENT_GATEWAY: "none" }
      : {}),
    SELECTED_MODULES: project.modules,
  };
}
export function projectEnvGroups(project: LaunchpadProject) {
  return getProjectEnvGroups(guideConfig(project) as FormValues);
}

/** Names, never values: also used to allowlist imported env checks. */
export function projectEnvKeys(project: LaunchpadProject): string[] {
  const keys: string[] = [
    "NEXT_PUBLIC_URL",
    "DATABASE_URL",
    "BETTER_AUTH_SECRET",
    "NEXT_PUBLIC_AUTH_EMAIL",
    "NEXT_PUBLIC_EMAIL_CLIENT",
  ];
  const config = guideConfig(project);
  keys.push(...projectEnvGroups(project).flatMap((group) => group.fields));
  if (config.NEXT_PUBLIC_EMAIL_CLIENT === "resend")
    keys.push("RESEND_API_KEY", "NEXT_PUBLIC_SUPPORT_MAIL");
  if (config.NEXT_PUBLIC_ALLOW_RATE_LIMIT === "upstash")
    keys.push("UPSTASH_REDIS_REST_URL", "UPSTASH_REDIS_REST_TOKEN");
  if (project.modules.includes("jobs"))
    keys.push("JOBS_DRIVER", "INNGEST_EVENT_KEY", "INNGEST_SIGNING_KEY");
  if (project.modules.includes("webhooks")) keys.push("WEBHOOK_SECRET_KEY");
  if (project.modules.includes("ai_agents"))
    keys.push(
      "BACKEND_URL",
      "BACKEND_HMAC_SECRET",
      "JOBS_DRIVER",
      "INNGEST_EVENT_KEY",
      "INNGEST_SIGNING_KEY",
    );
  return [...new Set(keys)];
}

export const SERVICE_LABELS: Record<string, string> = {
  postgres: "Postgres",
  stripe: "Stripe",
  dodo: "Dodo Payments",
  resend: "Resend",
  upstash: "Upstash Redis",
  vercel_blob: "Vercel Blob",
  r2: "Cloudflare R2",
};

export function selectedServices(project: LaunchpadProject): string[] {
  const keys = new Set(projectEnvKeys(project));
  const config = guideConfig(project);
  return [
    "postgres",
    ...(project.modules.includes("billing") &&
    project.config.NEXT_PUBLIC_PAYMENT_GATEWAY === "stripe"
      ? ["stripe"]
      : []),
    ...(project.modules.includes("billing") &&
    project.config.NEXT_PUBLIC_PAYMENT_GATEWAY === "dodo"
      ? ["dodo"]
      : []),
    ...(project.config.NEXT_PUBLIC_EMAIL_CLIENT === "resend" ? ["resend"] : []),
    ...(keys.has("UPSTASH_REDIS_REST_URL") ? ["upstash"] : []),
    ...(config.NEXT_PUBLIC_IMAGE_STORAGE === "vercel_blob"
      ? ["vercel_blob"]
      : []),
    ...(config.NEXT_PUBLIC_IMAGE_STORAGE === "cloudflare_r2" ? ["r2"] : []),
  ];
}

const MODULE_GUIDANCE: Record<
  string,
  { title: string; steps: string[]; acceptance: string[] }
> = {
  multi_tenancy: {
    title: "Workspace isolation",
    steps: [
      "Create two workspaces with different owners, invite a member, and switch workspaces.",
      "Check authorization on the server for every workspace query and mutation.",
    ],
    acceptance: ["A member cannot read or modify the other workspace's data."],
  },
  ai: {
    title: "AI experience",
    steps: [
      "Configure only the model providers you intend to use in apps/web/.env.",
      "Try a successful request, a provider failure, cancellation, and exhausted credits; show useful feedback.",
    ],
    acceptance: [
      "The core AI flow works and handles provider errors without leaking credentials.",
    ],
  },
  ai_agents: {
    title: "Agent and RAG workflows",
    steps: [
      "Create a small collection, ingest a sample document, and run an agent against it.",
      "Test signed backend execution, job retries, and workspace access to collections.",
    ],
    acceptance: [
      "Ingestion and agent execution finish; unauthorized access is rejected.",
    ],
  },
  api_keys: {
    title: "API key lifecycle",
    steps: [
      "Create a scoped key, call an allowed endpoint, then revoke the key.",
      "Check invalid keys, missing scopes, and rate limits.",
    ],
    acceptance: ["Revoked keys stop working and scopes are enforced."],
  },
  jobs: {
    title: "Background jobs",
    steps: [
      "For queued execution, set JOBS_DRIVER=inngest and configure event/signing keys.",
      "Sync /api/inngest with Inngest, dispatch a job, and test retry and dead-letter replay on /admin/jobs.",
    ],
    acceptance: [
      "Queued work finishes once; exhausted retries appear for recovery.",
    ],
  },
  notifications: {
    title: "Notifications",
    steps: [
      "Trigger a real event, check its inbox notification, and change channel preferences.",
      "Trigger the same dedupe key twice and confirm only one notification is created.",
    ],
    acceptance: ["Notifications respect preferences and deduplication."],
  },
  audit_log: {
    title: "Audit trail",
    steps: [
      "Perform a configuration change and inspect /admin/audit.",
      "Check actor, target, workspace, and redaction; roll back a transaction and confirm no audit event commits.",
    ],
    acceptance: [
      "The audit trail records committed changes without secret metadata.",
    ],
  },
  webhooks: {
    title: "Outgoing webhooks",
    steps: [
      "Configure WEBHOOK_SECRET_KEY once and keep it securely; replacing it makes existing endpoint secrets unreadable.",
      "Register a test endpoint, verify the HMAC signature, replay a failed delivery, and try a private-network URL.",
    ],
    acceptance: [
      "Delivery signatures and retries work; private-network destinations are rejected.",
    ],
  },
  feature_flags: {
    title: "Feature flags",
    steps: [
      "Create targeting rules in /admin/flags and preview a matching and a non-matching user.",
      "Check both UI visibility and server enforcement for the feature.",
    ],
    acceptance: [
      "Flag rules apply consistently and hidden features cannot be called directly.",
    ],
  },
  onboarding: {
    title: "Onboarding",
    steps: [
      "Try a fresh account and complete tasks using real app actions.",
      "For an existing user database, run the documented onboarding backfill before enabling the wizard.",
    ],
    acceptance: [
      "New users see useful guidance; existing users are not incorrectly treated as new.",
    ],
  },
};

/** One catalog; audience modes never create separate task identities. */
export function buildLaunchpadTasks(
  project: LaunchpadProject,
  deployment: DeploymentPath,
): LaunchpadTask[] {
  project = { ...project, config: guideConfig(project) };
  const platforms = [...new Set(["web", ...project.platforms])]
    .sort()
    .join(", ");
  const integrationSelection = `Selected modules: ${[...project.modules].sort().join(", ") || "core only"}. Services: ${selectedServices(
    project,
  )
    .map((id) => SERVICE_LABELS[id])
    .join(", ")}.`;
  const tasks: LaunchpadTask[] = [];
  const add = (
    id: string,
    stage: StageId,
    title: string,
    purpose: string,
    instructions: string[],
    acceptance: string[],
    options: Partial<
      Pick<
        LaunchpadTask,
        | "commands"
        | "prerequisites"
        | "fixes"
        | "links"
        | "verification"
        | "checkId"
        | "scope"
      >
    > = {},
  ) => {
    const task = {
      id,
      stage,
      title,
      purpose,
      prerequisites: options.prerequisites ?? [],
      presentations: {
        founder: [
          `Your goal: ${acceptance[0]}`,
          options.prerequisites?.length
            ? `Arrange ${options.prerequisites.join(" and ")} before handing this task over.`
            : "Decide who will carry out this task and who will review the result.",
          "Share the technical handoff below with your developer. Ask for a demonstration of the expected result before confirming completion.",
        ],
        builder: [
          ...instructions,
          "Review the changes and run the acceptance checks before marking this task complete.",
        ],
        developer: instructions,
      },
      commands: options.commands ?? [],
      acceptance,
      fixes: options.fixes ?? [
        "Check the relevant app's .env.example and README against your selected modules and providers.",
        "Read the failing command or service logs, correct the cause, and retry this task.",
      ],
      links: options.links ?? [],
      verification:
        options.verification ??
        "Confirm the expected result yourself, then mark this task complete.",
      ...(options.checkId
        ? { checkId: options.checkId, scope: options.scope }
        : {}),
    };
    // Includes instructions/acceptance so changed applicability cannot inherit a manual tick.
    tasks.push({
      ...task,
      signature: JSON.stringify([
        id,
        purpose,
        instructions,
        acceptance,
        options,
      ]),
    });
  };
  const cmd = (command: string, label = "Run from the project root") => ({
    label,
    command,
  });
  const groups = projectEnvGroups(project);
  const accounts = selectedServices(project).map((id) => SERVICE_LABELS[id]!);
  const authProviders = project.config.NEXT_PUBLIC_AUTH_PROVIDERS as string[];
  accounts.push(
    ...authProviders
      .filter((id) => ["google", "github", "linkedin"].includes(id))
      .map((id) => `${id} OAuth application`),
  );
  if (project.modules.includes("ai"))
    accounts.push("at least one supported AI model provider");
  if (project.modules.includes("jobs") || project.modules.includes("ai_agents"))
    accounts.push("Inngest (when using queued jobs)");
  if (project.modules.includes("ai_agents"))
    accounts.push("Python service hosting");

  add(
    "local.accounts",
    "local",
    "Connect your accounts",
    "Choose the services your project actually uses before configuring it.",
    accounts.map(
      (account) =>
        `Provision or connect ${account}; obtain its credentials from your service configuration and keep them in your own environment.`,
    ),
    [
      "You can access each selected service and know where its credentials belong.",
    ],
    {
      links: [
        {
          label: "Database setup reference",
          url: "https://www.postgresql.org/docs/current/",
        },
      ],
    },
  );
  add(
    "local.environment",
    "local",
    "Set up your environment",
    "Keep configuration consistent across the web app, database, and selected native clients.",
    [
      "Use Node and pnpm versions required by the downloaded package.json.",
      "Copy apps/web/.env.example to apps/web/.env. Copy packages/database/.env.example to packages/database/.env and use the same DATABASE_URL.",
      ...groups.map(
        (group) => `${group.title}: fill ${group.fields.join(", ")}.`,
      ),
      ...projectEnvKeys(project)
        .filter((key) => !["NEXT_PUBLIC_AUTH_EMAIL"].includes(key))
        .map((key) => `${key}: ${envHint(key)}`),
      ...(project.platforms.includes("desktop")
        ? [
            "Copy apps/desktop/.env.example to apps/desktop/.env; set VITE_API_URL to your web API origin.",
          ]
        : []),
      ...(project.platforms.includes("mobile")
        ? [
            "Copy apps/mobile/.env.example to apps/mobile/.env; a physical device needs a reachable EXPO_PUBLIC_API_URL, not localhost.",
          ]
        : []),
      "Keep .env files, signing keys, and credentials outside version control. The Launchpad does not collect their values.",
    ],
    ["The required environment files exist and target the intended services."],
    {
      commands: [
        cmd("openssl rand -base64 32", "Generate a Better Auth secret locally"),
      ],
      prerequisites: ["Access to your selected service dashboards"],
    },
  );
  add(
    "local.install",
    "local",
    "Install and initialize",
    "Install dependencies and initialize your development database.",
    [
      "Install dependencies in the project root, generate Prisma, then apply development migrations before starting the web app.",
      "Development migrations may change your database. Use a development database, not production.",
    ],
    ["The web app starts and you can open its local URL."],
    {
      commands: [
        cmd("pnpm install"),
        cmd("pnpm generate"),
        cmd("pnpm migrate"),
        cmd("pnpm --dir apps/web dev"),
      ],
      prerequisites: ["Environment files configured"],
    },
  );
  add(
    "local.doctor",
    "local",
    "Check the local foundation",
    "Find configuration problems before building features.",
    [
      "Run the doctor in your downloaded project. Interactive mode can help configure local values; --json emits a report without editing environment files.",
      "Import the JSON report using Local environment in this Launchpad. A nonzero exit code can still produce a useful failure report.",
      "Storage checks may write and delete a small probe object. Review remaining warnings and repeat the check after fixing failures.",
    ],
    [
      "You have reviewed every relevant failure and warning; untested capabilities remain unverified.",
    ],
    {
      commands: [
        cmd("pnpm doctor"),
        cmd(
          "pnpm --silent doctor --json > launchpad-report.json",
          "Export a doctor JSON report",
        ),
      ],
      verification:
        "Import the report to see explicit service results below. This overall review requires manual confirmation.",
    },
  );

  for (const service of selectedServices(project)) {
    const label = SERVICE_LABELS[service]!;
    for (const scope of ["local", "production"] as const) {
      add(
        `${scope}.${service}`,
        scope === "local" ? "local" : "launch",
        `Check ${label}${scope === "production" ? " in production" : ""}`,
        `Confirm ${label} accepts the credentials used in this environment.`,
        [
          "Run the doctor with this environment's credentials and import the report under the matching environment.",
          "A credential probe does not prove that application workflows, webhook delivery, backups, or native releases work.",
        ],
        [`The ${label} service probe explicitly reports a pass for ${scope}.`],
        {
          checkId: service,
          scope,
          verification: `An explicit ${service} service pass from an imported ${scope} report. You can also record manual confirmation separately.`,
        },
      );
    }
  }
  if (project.modules.includes("ai_agents")) {
    add(
      "local.backend",
      "local",
      "Run the Python companion",
      "Agent and RAG jobs need the signed Python execution service.",
      [
        "Install uv and Python 3.12; read apps/backend/README.md and run uv sync in apps/backend.",
        "Set BACKEND_URL and the same BACKEND_HMAC_SECRET in web and backend environments. Use pnpm doctor for the shared secret setup.",
        "Enable pgvector in Postgres. For queued jobs, configure Inngest and sync /api/inngest.",
      ],
      [
        "The backend starts, rejects invalid signatures, and accepts a signed test execution.",
      ],
      {
        commands: [
          cmd("uv sync", "Run in apps/backend"),
          cmd("openssl rand -hex 32", "Generate the shared backend secret"),
          cmd(
            "pnpm --dir apps/backend dev",
            "Start the Python development API",
          ),
        ],
        links: [
          {
            label: "Install uv",
            url: "https://docs.astral.sh/uv/getting-started/installation/",
          },
        ],
      },
    );
  }
  if (project.platforms.includes("desktop")) {
    add(
      "desktop.run",
      "local",
      "Run the desktop client",
      "Test the desktop app against your working web API.",
      [
        "Configure apps/desktop/.env using its example. The API origin must not end with /api/trpc.",
        "Start the web API, then run the Electron app. Test sign-in and an OAuth return through the desktop deep link if selected.",
        "On Linux, if Electron's binary download was skipped, follow the Electron install step in AGENTS.md.",
      ],
      ["The desktop app starts and can authenticate against your API."],
      { commands: [cmd("pnpm --dir apps/desktop dev")] },
    );
  }
  if (project.platforms.includes("mobile")) {
    add(
      "mobile.run",
      "local",
      "Run the mobile client",
      "Test the mobile experience on a device or emulator with a reachable web API.",
      [
        "Configure apps/mobile/.env from its example; use your machine's LAN address for physical-device API access.",
        "Start Expo and choose a device or emulator. Configure the app scheme and test selected authentication flows.",
      ],
      [
        "The app opens on the intended device and a signed-in user can reach the API.",
      ],
      {
        commands: [
          cmd("pnpm --dir apps/mobile start"),
          cmd("pnpm --dir apps/mobile android", "Android emulator"),
          cmd("pnpm --dir apps/mobile ios", "iOS simulator on macOS"),
        ],
        links: [
          {
            label: "Expo development",
            url: "https://docs.expo.dev/get-started/start-developing/",
          },
        ],
      },
    );
  }

  add(
    "mvp.define",
    "mvp",
    "Define one useful customer journey",
    "Set a clear boundary for your first usable product.",
    [
      "Write down the target customer, their problem, the single result the MVP delivers, and how you will know it works.",
      "Describe the path from first visit to that result; list the screens, data, and selected modules it needs.",
      "Keep a separate list of later ideas so they do not delay the first usable release.",
    ],
    [
      "A tester can follow a written scenario and judge whether the product delivers its promised result.",
    ],
  );
  add(
    "mvp.customize",
    "mvp",
    "Make the starter your product",
    "Replace demonstration content with the experience your customers need.",
    [
      "Configure branding in site settings and update your landing copy, support contact, and relevant legal content.",
      "Implement the core journey in root apps/ and packages/ using existing components and server authorization patterns.",
      `Use the selected modules (${project.modules.join(", ") || "core only"}) rather than adding duplicate infrastructure.`,
      "Keep project-specific data and business rules covered by meaningful tests.",
    ],
    [
      "The core journey works with your product's content and real stored data; demo placeholders are removed.",
    ],
  );
  for (const moduleId of project.modules) {
    const guidance = MODULE_GUIDANCE[moduleId];
    if (!guidance) continue;
    add(
      `mvp.${moduleId}`,
      "mvp",
      guidance.title,
      `Validate the ${moduleId.replaceAll("_", " ")} capability your project includes.`,
      guidance.steps,
      guidance.acceptance,
    );
  }
  add(
    "mvp.test",
    "mvp",
    "Test the core journey",
    "Catch failures that would stop a customer from using your MVP.",
    [
      "Test a fresh signup, sign-in, core action, sign-out, and forbidden access to another user's data.",
      `Exercise empty states, invalid input, slow or failed services, and flows on: ${platforms}.`,
      integrationSelection,
      "Run the available lint, typecheck, tests, and production builds. Check the downloaded package scripts before assuming a command exists.",
    ],
    [
      "The acceptance scenario succeeds and failures give useful feedback; checks pass for selected apps.",
    ],
    {
      commands: [
        cmd("pnpm lint"),
        cmd("pnpm --dir apps/web typecheck"),
        cmd("pnpm test"),
        cmd("pnpm --dir apps/web build"),
      ],
    },
  );

  add(
    "launch.environment",
    "launch",
    "Configure production services",
    "Separate production credentials and data from development.",
    [
      "Set production NEXT_PUBLIC_URL, DATABASE_URL, and a strong BETTER_AUTH_SECRET in the host's environment settings. Configure only enabled integrations.",
      integrationSelection,
      "Keep preview and production environments separate. Use production credentials for live services and confirm provider modes.",
      "Supply DATABASE_URL when running production migrations; production builds do not deploy database migrations.",
      "Run the doctor with the intended production environment and import its report as Production. Selecting a report scope does not change the credentials used by the command.",
    ],
    [
      "Production targets its own database and configured integrations; migrations have been reviewed and deployed.",
    ],
    {
      commands: [
        cmd(
          "pnpm --dir packages/database migrate:deploy",
          "Run with the production DATABASE_URL supplied securely",
        ),
      ],
      prerequisites: ["A production database and hosting account"],
    },
  );
  if (deployment === "vercel") {
    add(
      "launch.vercel",
      "launch",
      "Deploy the web app on Vercel",
      "Release the web app using the repo's managed deployment path.",
      [
        "Connect your Git repository to Vercel and set the project root to apps/web.",
        "Configure preview and production environment variables separately; use the repository's Next.js configuration and verify the install/build settings.",
        "Deploy a preview, run the core acceptance scenario, then deploy the production branch. Keep the last working deployment available for rollback.",
      ],
      ["The production URL serves the app and the core journey works."],
      {
        links: [
          {
            label: "Vercel monorepo deployment",
            url: "https://vercel.com/docs/monorepos",
          },
        ],
      },
    );
  } else {
    add(
      "launch.docker",
      "launch",
      "Deploy the web app with Docker",
      "Operate the documented web and Postgres containers on your own host.",
      [
        "Read the downloaded docker-compose.yml and Dockerfile.web; configure required secrets in a sibling .env. The shipped Compose example hardcodes localhost origins and development database credentials: replace those settings, including published database ports, for your production host.",
        "Set persistent database storage, a TLS reverse proxy, and restricted access to internal services before exposing the app.",
        "Build and start the stack, deploy reviewed migrations, and inspect logs and the public URL.",
      ],
      [
        "The HTTPS URL serves the app, data survives a container restart, and internal services are not exposed publicly.",
      ],
      {
        commands: [
          cmd("pnpm docker:build:web"),
          cmd("pnpm docker:up"),
          cmd("docker compose logs --tail=100"),
        ],
        links: [
          {
            label: "Docker Compose production guidance",
            url: "https://docs.docker.com/compose/how-tos/production/",
          },
        ],
      },
    );
  }
  if (project.modules.includes("ai_agents")) {
    add(
      "launch.backend",
      "launch",
      "Deploy companion services",
      "The Python API and Inngest jobs must be reachable independently of the web deployment.",
      [
        "Deploy the documented backend container on infrastructure that runs Python services; a web-only Vercel deployment does not host this companion.",
        "Configure production BACKEND_URL and the matching BACKEND_HMAC_SECRET on both services.",
        "Enable pgvector, configure Inngest keys, sync production /api/inngest, and run an end-to-end ingestion and agent task.",
      ],
      [
        "A production agent task completes through the queue and signed Python API.",
      ],
    );
  }
  add(
    "launch.domain",
    "launch",
    "Connect your domain",
    "Give users a stable HTTPS address and keep generated links correct.",
    [
      "Add the domain to your host and configure its DNS records; Docker hosting also needs a configured TLS reverse proxy.",
      "Set NEXT_PUBLIC_URL to the final HTTPS origin and redeploy when build-time public values change.",
      "Check redirects, a fresh browser session, and links opened from email.",
    ],
    [
      "The final domain serves HTTPS and application links return to the correct origin.",
    ],
  );
  const auth = project.config.NEXT_PUBLIC_AUTH_PROVIDERS;
  if (
    Array.isArray(auth) &&
    auth.some((value) =>
      ["google", "github", "linkedin"].includes(String(value)),
    )
  ) {
    add(
      "launch.auth",
      "launch",
      "Check production OAuth callbacks",
      "A working local sign-in does not guarantee a working production callback.",
      [
        `For each selected OAuth provider (${auth.filter((v) => ["google", "github", "linkedin"].includes(String(v))).join(", ")}), register the production callback using the auth configuration and provider documentation.`,
        `Confirm the production origin, allowed redirect URLs, and app schemes for: ${platforms}.`,
        "Test a new user and a returning user on every selected platform.",
      ],
      [
        "Selected social sign-in flows return to the correct app without redirect or cookie errors.",
      ],
    );
  }
  if (project.config.NEXT_PUBLIC_EMAIL_CLIENT === "resend") {
    add(
      "launch.email",
      "launch",
      "Test production email delivery",
      "Users need working verification, recovery, and selected notification emails.",
      [
        "Verify the sending domain with Resend, configure its required DNS records, and use the correct sender address.",
        "Test the enabled verification and password-reset flows using a real inbox. Check that links point to production.",
        "If notifications are selected, test the email channel and preferences too.",
      ],
      [
        "Required emails arrive and their links work; API-key validity alone is insufficient.",
      ],
      {
        links: [
          {
            label: "Resend domain setup",
            url: "https://resend.com/docs/dashboard/domains/introduction",
          },
        ],
      },
    );
  }
  if (project.modules.includes("billing")) {
    const gateway = String(
      project.config.NEXT_PUBLIC_PAYMENT_GATEWAY ?? "none",
    );
    add(
      "launch.payments",
      "launch",
      "Test checkout and payment webhooks",
      "Verify that successful payments grant access exactly once.",
      [
        gateway === "none"
          ? "Choose a payment provider through the project's upgrade workflow before activating checkout."
          : `Configure ${gateway} products and prices, return URLs, and the production payment webhook endpoint.`,
        "Use sandbox credentials first. Test checkout success, cancellation, signature rejection, and replaying the same webhook event.",
        "Check credits or entitlements, invoices, and provider-specific refund behavior before enabling live payments.",
      ],
      [
        "A successful payment grants the intended access; duplicate callbacks do not grant it again.",
      ],
      {
        prerequisites: [
          "Provider dashboard access",
          "A reachable payment webhook endpoint",
        ],
      },
    );
  }
  if (project.platforms.includes("desktop")) {
    add(
      "desktop.release",
      "launch",
      "Package and release the desktop app",
      "Ship an installer that uses the production API and authenticates correctly.",
      [
        "Set the production VITE_API_URL, product identifiers, app name, protocol scheme, icons, and installer metadata.",
        "Use the configured Electron packaging targets. Signing and notarization require your own credentials and platform tooling; consult apps/desktop/README.md.",
        "Test the installer and OAuth deep links on each target OS. Snap publishing requires your own registered Snap and authenticated Snapcraft account.",
        "Additional store distribution and automatic updates require the configuration described in the README; they are not enabled by this guide.",
      ],
      [
        "A tested installer connects to production; signing and distribution requirements for your chosen OS are satisfied.",
      ],
      {
        commands: [
          cmd("pnpm --dir apps/desktop build:prod"),
          cmd("pnpm --dir apps/desktop package"),
        ],
        links: [
          {
            label: "Electron distribution",
            url: "https://www.electronjs.org/docs/latest/tutorial/application-distribution",
          },
        ],
      },
    );
  }
  if (project.platforms.includes("mobile")) {
    add(
      "mobile.release",
      "launch",
      "Build and release the mobile app",
      "Test a production native build before submitting it to an app store.",
      [
        "Configure Expo/EAS with your own project ID, bundle/package identifiers, app scheme, icons, and production API environment.",
        "Review apps/mobile/eas.json. Store submission requires your own store accounts and submission configuration.",
        "Build a preview, test authentication and the core journey on real devices, then build production artifacts.",
        "Submit through EAS and complete the store's required listing and review steps. Configure EAS Update separately if you need OTA updates; native changes still need a new binary.",
      ],
      [
        "Production builds work on intended devices and the release has completed the chosen store or distribution process.",
      ],
      {
        commands: [
          cmd("npx eas-cli login", "Run in apps/mobile"),
          cmd(
            "npx eas-cli build --platform android --profile preview",
            "Run in apps/mobile",
          ),
          cmd(
            "npx eas-cli build --platform android --profile production",
            "Run in apps/mobile",
          ),
          cmd(
            "npx eas-cli build --platform ios --profile production",
            "Run in apps/mobile; requires Apple credentials",
          ),
        ],
        links: [
          {
            label: "EAS Build",
            url: "https://docs.expo.dev/build/introduction/",
          },
          {
            label: "EAS Submit",
            url: "https://docs.expo.dev/submit/introduction/",
          },
        ],
      },
    );
  }
  add(
    "launch.smoke",
    "launch",
    "Run the launch acceptance check",
    "Confirm the released product works as a customer would use it.",
    [
      `Use a clean session and real devices for: ${platforms}. Run your written core journey against production.`,
      integrationSelection,
      "Test authorization, selected integrations, and failure feedback without using an admin account for the customer flow.",
      "Record unresolved launch blockers and fix them before sharing the release widely.",
    ],
    [
      "The intended customer can complete the core journey on all selected platforms.",
    ],
  );

  add(
    "operate.backups",
    "operate",
    "Backups and restore",
    "A backup is useful only if you can restore it.",
    [
      "Enable database backups and decide retention and recovery objectives appropriate to your product.",
      "Restore a backup to an isolated database, run application checks against it, and record the recovery procedure.",
      "Include uploaded files and required encryption/signing secrets in your recovery plan; restrict access to backups.",
    ],
    [
      "A restore drill succeeds without touching the live database, and the recovery steps are documented.",
    ],
  );
  add(
    "operate.monitoring",
    "operate",
    "Monitor errors and availability",
    "Learn about failures before customers have to tell you.",
    [
      "Configure your selected logging and analytics tools; verify a test error and avoid sending credentials or sensitive data to logs.",
      "Set up an external uptime check for your production URL and an alert destination your team watches.",
      "Watch failed jobs and webhook deliveries when those modules are selected; define who responds and how.",
    ],
    [
      "A simulated failure reaches the right person and there is a documented response.",
    ],
  );
  add(
    "operate.rollback",
    "operate",
    "Practice rollback",
    "Have a recovery path when a deployment breaks the product.",
    [
      deployment === "vercel"
        ? "Document how to restore the previous working Vercel deployment and test the procedure in preview."
        : "Keep a previous working container image and document how to redeploy it; rehearse away from production.",
      "Keep migrations additive where possible. Application rollback does not automatically reverse database changes.",
      `Document distribution and rollback behavior for: ${platforms}; native versions have a separate release process.`,
    ],
    ["The team can recover a failed release using a tested procedure."],
  );
  add(
    "operate.upgrades",
    "operate",
    "Review releases and security fixes",
    "Keep the starter current while preserving your product's custom code.",
    [
      `This project records starter v${project.templateVersion}. Review its release notes and security advisories in this Launchpad.`,
      "Preview an upgrade from My Projects, apply it in a separate branch, inspect conflicts and migration requirements, and run the project's checks.",
      "After changing modules, providers, platforms, or starter version, rerun doctor checks and repeat affected acceptance scenarios.",
    ],
    [
      "Relevant advisories have been reviewed and any upgrade has been tested before release.",
    ],
  );
  return tasks.sort(
    (a, b) =>
      STAGES.findIndex((s) => s.id === a.stage) -
      STAGES.findIndex((s) => s.id === b.stage),
  );
}

export function renderLaunchpadMarkdown(
  project: LaunchpadProject,
  deployment: DeploymentPath,
  mode: GuideMode,
): string {
  const lines = [
    "## Project Launchpad",
    "",
    `Guide mode: ${mode} · Web deployment: ${deployment} · Starter: v${project.templateVersion}`,
    "",
    "Progress is optional. Imported reports are user-supplied evidence; a local pass does not verify production.",
    "",
  ];
  for (const stage of STAGES) {
    lines.push(`### ${stage.title}`, "", stage.description, "");
    for (const task of buildLaunchpadTasks(project, deployment).filter(
      (t) => t.stage === stage.id,
    )) {
      lines.push(`#### ${task.title}`, "", task.purpose, "");
      if (task.prerequisites.length)
        lines.push(`Prerequisites: ${task.prerequisites.join("; ")}`, "");
      lines.push(...task.presentations[mode].map((line) => `- ${line}`), "");
      if (mode === "founder")
        lines.push(
          "Technical handoff:",
          "",
          ...task.presentations.developer.map((line) => `- ${line}`),
          "",
        );
      for (const command of task.commands)
        lines.push(command.label, "", "```bash", command.command, "```", "");
      lines.push(
        "Expected result:",
        ...task.acceptance.map((item) => `- ${item}`),
        "",
        `Verification: ${task.verification}`,
        "",
        "Common fixes:",
        ...task.fixes.map((item) => `- ${item}`),
        "",
      );
      for (const link of task.links)
        lines.push(`- [${link.label}](${link.url})`);
    }
  }
  return lines.join("\n");
}
