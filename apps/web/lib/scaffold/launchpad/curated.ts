import {
  buildLaunchpadTasks,
  guideConfig,
  projectEnvKeys,
  selectedServices,
  SERVICE_LABELS,
} from "./catalog";
import { settingHint } from "./env-guidance";
import { GUIDE_REFERENCES as refs } from "./references";
import type { DeploymentPath, LaunchpadProject, LaunchpadTask } from "./types";

type Step = {
  context?: string;
  id: string;
  title: string;
  instructions: string[];
  result: string;
  commands?: LaunchpadTask["commands"];
  prerequisites?: string[];
  links?: LaunchpadTask["links"];
  details?: string[];
  fixes?: string[];
};
const command = (value: string, label = "Run from the project root") => ({
  label,
  command: value,
});
const serviceSteps: Record<string, { instructions: string[]; result: string }> =
  {
    postgres: {
      instructions: [
        "Open your Postgres provider dashboard and create a development database, or choose an existing development database.",
        "Locate its connection details. Keep production data in a separate database.",
        "Keep its connection string private; the database-setting task below explains where to save it.",
      ],
      result:
        "You can access a development database and locate its connection string.",
    },
    dodo: {
      instructions: [
        "Open the Dodo Payments dashboard and switch to test mode before creating development products or credentials.",
        "Under Products, create the credits product your app will sell and note its product ID. Under Developer → API Keys, create a test API key.",
        "Keep the product ID and API key available privately for the Dodo settings task. Production activation and webhook testing are separate launch tasks.",
      ],
      result:
        "A test product and test API key exist in the same Dodo environment.",
    },
    stripe: {
      instructions: [
        "Open your Stripe dashboard and use its test environment for development.",
        "Create the product and price your app will sell and locate Developers → API keys.",
        "Keep the test key privately. Configure the application and webhook signing secret in the following tasks before testing checkout.",
      ],
      result: "The Stripe test product, price and API key are available.",
    },
    resend: {
      instructions: [
        "Open Resend and add a sending domain you control.",
        "Add the DNS records shown by Resend at your domain provider, then wait for Resend to show that the domain is verified.",
        "Create an API key with sending permissions. Keep it private for the email settings task.",
      ],
      result:
        "Resend shows a verified sending domain and you have a private sending API key.",
    },
    upstash: {
      instructions: [
        "Open the Upstash console, create a Redis database or select your existing development database.",
        "Open the REST API section and locate its REST URL and REST token; these are different from a Redis TCP connection string.",
        "Keep the pair privately for the Redis settings task. Use the same database for both values.",
      ],
      result:
        "The REST URL and token belong to one reachable Upstash database.",
    },
    r2: {
      instructions: [
        "Open Cloudflare → R2 and create or select a bucket for development uploads. Note the account ID and exact bucket name.",
        "Create R2 API credentials scoped to that bucket with the required object read/write permissions. Keep the access key ID and secret privately.",
        "For public images, configure the bucket’s public development URL or custom domain. Do not make private customer files public.",
      ],
      result:
        "The R2 bucket, scoped API credentials and intended image-serving address are available.",
    },
    vercel_blob: {
      instructions: [
        "Open your Vercel project → Storage and create or connect a Blob store.",
        "Locate the store’s read/write token and keep it private.",
        "Confirm that the store belongs to the intended project and environment before configuring the app.",
      ],
      result: "A Blob store is connected and its private token is available.",
    },
  };

/** Reviewed small actions. No network request or model is used to build a guide. */
export function buildCuratedTasks(
  project: LaunchpadProject,
  deployment: DeploymentPath,
): LaunchpadTask[] {
  project = { ...project, config: guideConfig(project) };
  const anchors = buildLaunchpadTasks(project, deployment);
  const tasks: LaunchpadTask[] = [];
  const add = (anchor: LaunchpadTask, step: Step) => {
    const instructions = step.instructions;
    const task: LaunchpadTask = {
      ...anchor,
      id: "curated:" + step.id,
      anchorId: anchor.id,
      title: step.title,
      sourceIds: [`source:${anchor.id}`, `curated:${step.id}`],
      generated: false,
      prerequisites: step.prerequisites ?? anchor.prerequisites,
      presentations: {
        founder: instructions,
        builder: instructions,
        developer: step.details ?? [],
      },
      commands: step.commands ?? [],
      acceptance: [step.result],
      verification:
        "Check the expected result yourself. Mark this step complete only after confirming it.",
      fixes: step.fixes ?? anchor.fixes,
      links:
        step.links ?? (anchor.links.length ? anchor.links : [refs.starter]),
      signature: "",
    };
    delete task.checkId;
    delete task.scope;
    task.signature = JSON.stringify([
      task.id,
      step.context,
      task.presentations,
      task.commands,
      task.acceptance,
      task.prerequisites,
    ]);
    tasks.push(task);
  };
  const keys = projectEnvKeys(project);
  const settings = (anchor: LaunchpadTask) => {
    const production = anchor.stage === "launch";
    const location = production
      ? "your production host’s environment settings"
      : "apps/web/.env";
    const groups: Array<{
      id: string;
      title: string;
      keys: string[];
      links: LaunchpadTask["links"];
    }> = [
      {
        id: "database",
        title: "Connect the database",
        keys: ["DATABASE_URL"],
        links: [refs.postgres, refs.prisma],
      },
      {
        id: "auth-secret",
        title: "Protect sign-in sessions",
        keys: ["BETTER_AUTH_SECRET"],
        links: [refs.auth],
      },
      {
        id: "web-origin",
        title: "Set the app address and sign-in options",
        keys: [
          "NEXT_PUBLIC_URL",
          "NEXT_PUBLIC_AUTH_EMAIL",
          "NEXT_PUBLIC_EMAIL_CLIENT",
        ],
        links: [refs.starter, refs.auth],
      },
      ...(["google", "github", "linkedin"] as const).map((provider) => ({
        id: "oauth-" + provider,
        title: `Configure ${provider} sign-in`,
        keys: [
          `AUTH_${provider.toUpperCase()}_CLIENT_ID`,
          `AUTH_${provider.toUpperCase()}_CLIENT_SECRET`,
        ],
        links: [refs[provider], refs.auth],
      })),
      {
        id: "redis",
        title: "Connect Upstash rate limiting",
        keys: [
          "NEXT_PUBLIC_ALLOW_RATE_LIMIT",
          "UPSTASH_REDIS_REST_URL",
          "UPSTASH_REDIS_REST_TOKEN",
        ],
        links: [refs.upstash],
      },
      {
        id: "r2-credentials",
        title: "Connect Cloudflare R2 credentials",
        keys: ["R2_ACCOUNT_ID", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY"],
        links: [refs.r2],
      },
      {
        id: "r2-bucket",
        title: "Choose the upload bucket and public image address",
        keys: ["R2_BUCKET_NAME", "NEXT_PUBLIC_R2_PUBLIC_URL"],
        links: [refs.r2],
      },
      {
        id: "blob",
        title: "Connect Vercel Blob storage",
        keys: ["BLOB_READ_WRITE_TOKEN"],
        links: [refs.vercel_blob],
      },
      {
        id: "payment-provider",
        title: "Select the saved payment gateway",
        keys: ["NEXT_PUBLIC_PAYMENT_GATEWAY"],
        links: [
          project.config.NEXT_PUBLIC_PAYMENT_GATEWAY === "dodo"
            ? refs.dodo
            : refs.stripe,
        ],
      },
      {
        id: "dodo-credentials",
        title: "Configure Dodo credentials",
        keys: ["DODO_PAYMENTS_API_KEY", "DODO_PAYMENTS_WEBHOOK_KEY"],
        links: [refs.dodo],
      },
      {
        id: "dodo-product",
        title: "Configure the Dodo product and environment",
        keys: ["DODO_CREDITS_PRODUCT_ID", "DODO_PAYMENTS_ENVIRONMENT"],
        links: [refs.dodo],
      },
      {
        id: "dodo-urls",
        title: "Configure Dodo return and receipt links",
        keys: ["DODO_PAYMENTS_RETURN_URL", "NEXT_PUBLIC_DODO_PAYMENTS_URL"],
        links: [refs.dodo],
      },
      {
        id: "stripe",
        title: "Configure Stripe credentials",
        keys: ["STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET"],
        links: [refs.stripe],
      },
      {
        id: "email",
        title: "Configure email sending",
        keys: ["RESEND_API_KEY", "NEXT_PUBLIC_SUPPORT_MAIL"],
        links: [refs.resend],
      },
      {
        id: "logs",
        title: "Connect BetterStack logging",
        keys: [
          "BETTERSTACK_TELEMETRY_SOURCE_TOKEN",
          "BETTERSTACK_TELEMETRY_INGESTING_HOST",
        ],
        links: [refs.betterstack],
      },
      {
        id: "analytics",
        title: "Connect website analytics",
        keys: ["NEXT_PUBLIC_GOOGLE_ANALYTICS_MEASUREMENT_ID"],
        links: [refs.analytics],
      },
      {
        id: "ga4",
        title: "Enable analytics reports",
        keys: ["GA4_PROPERTY_ID", "GA4_CREDENTIALS_JSON"],
        links: [refs.ga4],
      },
      {
        id: "pagespeed",
        title: "Enable performance reports",
        keys: ["GOOGLE_PAGESPEED_API_KEY"],
        links: [refs.pagespeed],
      },
      {
        id: "ai",
        title: "Configure one AI provider",
        keys: [
          "NEXT_PUBLIC_AI_ENABLED",
          "OPENAI_API_KEY",
          "ANTHROPIC_API_KEY",
          "GOOGLE_GENERATIVE_AI_API_KEY",
          "OPENROUTER_API_KEY",
          "AI_GATEWAY_API_KEY",
          "OLLAMA_BASE_URL",
          "OPENAI_COMPATIBLE_BASE_URL",
        ],
        links: [refs.ai],
      },
      {
        id: "n8n",
        title: "Review the optional n8n AI integration",
        keys: ["N8N_WEBHOOK_URL", "N8N_WEBHOOK_JWT_KEY"],
        links: [refs.ai],
      },
      {
        id: "queue",
        title: "Configure background jobs",
        keys: ["JOBS_DRIVER", "INNGEST_EVENT_KEY", "INNGEST_SIGNING_KEY"],
        links: [refs.inngest],
      },
      {
        id: "backend",
        title: "Connect the Python API securely",
        keys: ["BACKEND_URL", "BACKEND_HMAC_SECRET"],
        links: [refs.python, refs.inngest],
      },
      {
        id: "webhooks",
        title: "Protect outgoing webhook secrets",
        keys: ["WEBHOOK_SECRET_KEY"],
        links: [refs.starter],
      },
    ];
    const covered = new Set<string>();
    for (const group of groups) {
      const selected = group.keys.filter((key) => keys.includes(key));
      if (!selected.length) continue;
      selected.forEach((key) => covered.add(key));
      const details = selected.map((key) => `${key}: ${settingHint(key)}`);
      const notes: string[] = [];
      if (group.id === "payment-provider")
        notes.push(
          `Set NEXT_PUBLIC_PAYMENT_GATEWAY to ${project.config.NEXT_PUBLIC_PAYMENT_GATEWAY === "dodo" ? "dodo" : project.config.NEXT_PUBLIC_PAYMENT_GATEWAY === "stripe" ? "stripe" : "none"}, matching your saved project selection.`,
        );
      if (group.id === "database")
        notes.push(
          production
            ? "Use a production database. Supply its DATABASE_URL privately to migration commands; do not point development commands at it."
            : "Save the same DATABASE_URL in packages/database/.env so the database commands and web app use the same development database.",
        );
      if (group.id === "ai")
        notes.push(
          "Choose one model provider you intend to use. Configure its credential or server address and leave other provider settings blank. Enable NEXT_PUBLIC_AI_ENABLED only when that provider is ready.",
        );
      if (group.id === "n8n")
        notes.push(
          "Leave both settings blank if you are not using n8n. If enabled, the webhook URL and JWT key must match your active workflow.",
        );
      if (group.id === "backend")
        notes.push(
          production
            ? "Use the deployed Python API origin for BACKEND_URL. The same BACKEND_HMAC_SECRET must be saved privately on both the web and Python services."
            : "Use the Python server’s printed address for BACKEND_URL, typically http://localhost:8000 in the downloaded starter. Save the same BACKEND_HMAC_SECRET privately in apps/web/.env and apps/backend/.env.",
        );
      if (group.id === "dodo-product")
        notes.push(
          production
            ? "Use live_mode only after sandbox checkout tests pass; the product and credentials must also belong to live mode."
            : "Use test_mode. The product ID and credentials must come from Dodo’s test environment.",
        );
      if (group.id === "queue")
        notes.push(
          production
            ? "Use the production Inngest event and signing keys. Sync the production /api/inngest endpoint before testing a queued job."
            : project.modules.includes("ai_agents")
              ? "Agent jobs always use Inngest. Start its development server against your web /api/inngest URL; follow the linked local-development guide for development mode and keys."
              : "Use Inngest for queued execution; general jobs can run inline locally. Configure event/signing keys only when using the hosted queue.",
        );
      if (group.id === "dodo-credentials" || group.id === "stripe")
        notes.push(
          "A webhook signing secret comes from the provider’s configured webhook endpoint, not its API-key screen. Local webhook delivery needs a reachable development URL or the provider’s documented forwarding tool.",
        );
      if (group.id === "webhooks")
        notes.push(
          "Generate this encryption key once and back it up securely. Replacing it later makes previously stored webhook secrets unreadable.",
        );
      const commands =
        group.id === "auth-secret"
          ? [
              command(
                "openssl rand -base64 32",
                "Generate a private sign-in secret",
              ),
            ]
          : group.id === "backend"
            ? [
                command(
                  "openssl rand -hex 32",
                  "Generate a private shared backend secret",
                ),
              ]
            : [];
      add(anchor, {
        id: `${anchor.stage}.env.${group.id}`,
        title: group.title + (production ? " for production" : ""),
        instructions: [
          `Open ${location}. Find the existing setting names below; keep their spelling and the existing equals signs.`,
          ...details,
          ...notes,
          `Fill applicable values privately, save, and ${production ? "redeploy when build-time settings change" : "restart the affected development server after changing its environment"}. Never paste credentials into task help.`,
        ],
        result:
          group.id === "ai"
            ? "One chosen provider is configured; unused providers remain blank."
            : group.id === "n8n"
              ? "Both settings match the workflow, or both are blank because n8n is unused."
              : `The applicable ${selected.join(", ")} settings have been reviewed and saved in the intended environment.`,
        commands,
        links: group.links,
        details: [
          `Starter reference: apps/web/.env.example${group.id === "database" ? " and packages/database/.env.example" : ""}.`,
          ...details,
        ],
        fixes: [
          "Compare the exact setting names with the supplied .env.example. Remove accidental spaces or line breaks in copied values.",
          "If the service rejects a key, confirm the account, environment and permissions match. Never share the value in logs or task help.",
        ],
      });
    }
    for (const key of keys.filter((key) => !covered.has(key)))
      add(anchor, {
        id: `${anchor.stage}.env.${key.toLowerCase()}`,
        title: `Configure ${key}`,
        instructions: [
          `Find ${key} in ${location}.`,
          settingHint(key),
          "Fill its value privately and save. Restart or redeploy the affected app.",
        ],
        result: `${key} matches the intended environment.`,
        links: [refs.starter],
      });
  };
  for (const anchor of anchors) {
    if (anchor.checkId) {
      tasks.push({
        ...anchor,
        links: [refs[anchor.checkId as keyof typeof refs] ?? refs.starter],
        presentations: {
          ...anchor.presentations,
          builder: [
            "Use the Import report action to import one doctor report for this environment.",
            "Read this task’s Passed imported check, Warning or Failed status. A missing result stays Not checked.",
            "Resolve failures using the provider reference below and import a fresh report. Do not rerun doctor separately for every check.",
          ],
        },
      });
      continue;
    }
    if (anchor.id === "local.accounts") {
      for (const service of selectedServices(project)) {
        const step = serviceSteps[service]!;
        add(anchor, {
          id: `local.account.${service}`,
          title: `Prepare ${SERVICE_LABELS[service]}`,
          ...step,
          links: [refs[service as keyof typeof refs] ?? refs.starter],
        });
      }
      const auth = project.config.NEXT_PUBLIC_AUTH_PROVIDERS as string[];
      for (const provider of ["google", "github", "linkedin"] as const)
        if (auth.includes(provider))
          add(anchor, {
            id: `local.account.${provider}`,
            title: `Register ${provider} sign-in`,
            instructions: [
              `Open the ${provider} developer console and create or select an OAuth application for this project.`,
              `Register the local web origin and redirect address used by Better Auth. Compare its social-provider configuration with the linked ${provider} documentation.`,
              `Locate the client ID and client secret. Keep the secret private for the ${provider} settings task; register production addresses separately when launching.`,
            ],
            result: `The ${provider} application permits your local sign-in callback.`,
            links: [refs[provider], refs.auth],
          });
      if (project.modules.includes("ai"))
        add(anchor, {
          id: "local.account.ai",
          title: "Choose one AI service for your product",
          instructions: [
            "Read the provider list in the AI SDK documentation and choose the service your product needs.",
            "Create that provider’s account or arrange access to your own model server. Obtain only the credentials for that service.",
            "Keep the credentials private. This configures AI features in your product; the Launchpad checklist itself needs no AI account.",
          ],
          result:
            "You know which one AI service the product will use and can access it.",
          links: [refs.ai],
        });
      if (
        project.modules.includes("jobs") ||
        project.modules.includes("ai_agents")
      )
        add(anchor, {
          id: "local.account.inngest",
          title: "Prepare the local job runner",
          instructions: [
            "Use the linked Inngest local-development guide to start a development server pointing at your web app’s /api/inngest address.",
            "Use the actual web port printed by your server. The development server and the web app have different addresses.",
            "Hosted Inngest credentials are needed for production. General jobs may run inline locally, but agent jobs need the runner.",
          ],
          result: "Inngest lists this app and its registered functions.",
          links: [refs.inngest],
        });
      continue;
    }
    if (anchor.id === "local.environment") {
      add(anchor, {
        id: "local.tools",
        title: "Check your local tools",
        instructions: [
          "Open the downloaded project folder in your editor and a terminal. A terminal is the window where you run the commands shown below tasks.",
          "Read package.json → engines and packageManager. Install the listed Node.js and pnpm versions before continuing.",
          "Keep this terminal in the project root, the folder containing pnpm-lock.yaml. Commands labelled with another folder must use that folder.",
        ],
        result: "Your Node.js and pnpm versions match the downloaded project.",
        links: [refs.starter],
      });
      add(anchor, {
        id: "local.env-files",
        title: "Create your private environment files",
        instructions: [
          "In your editor or file manager, copy apps/web/.env.example and save the copy as apps/web/.env.",
          "Copy packages/database/.env.example to packages/database/.env. Keep the examples intact.",
          "Keep environment files out of version control. These copies hold private credentials on your own computer; the following tasks explain the setting groups.",
        ],
        result:
          "Both private environment files exist alongside their examples.",
        links: [refs.starter, refs.prisma],
        details: [
          "Starter files: apps/web/.env.example; packages/database/.env.example.",
        ],
      });
      settings(anchor);
      continue;
    }
    if (anchor.id === "launch.environment") {
      settings(anchor);
      add(anchor, {
        id: "launch.migrations",
        title: "Apply reviewed production migrations",
        instructions: [
          "Back up the production database and review the pending migration changes with the person responsible for the code.",
          "Supply the production DATABASE_URL privately and use the deployment command below. Never use development reset commands on production.",
          "Check the command’s result before deploying code that needs the new schema. A successful app build does not apply database migrations.",
        ],
        result:
          "Reviewed migrations are applied to the intended production database.",
        commands: anchor.commands,
        links: [refs.prisma, refs.backup],
      });
      continue;
    }
    if (anchor.id === "local.install") {
      const steps = [
        {
          id: "install",
          title: "Install project dependencies",
          instructions: [
            "Use the terminal in the project root and run the install command below.",
            "Wait for the command to finish. If it reports an error, resolve it before running database commands.",
          ],
          result: "Dependencies install successfully.",
          commands: [anchor.commands[0]!],
        },
        {
          id: "generate",
          title: "Generate the database client",
          instructions: [
            "Run the generate command after installation. It creates the code the app uses to talk to the database.",
            "Wait for the command to finish successfully before continuing.",
          ],
          result: "The Prisma client is generated without errors.",
          commands: [anchor.commands[1]!],
        },
        {
          id: "migrate",
          title: "Initialize the development database",
          instructions: [
            "Confirm DATABASE_URL points to your development database. These migrations can change its tables; back up existing data first.",
            "Run the migration command below. If prompted about resetting existing data, stop and investigate with your developer.",
            "Read the result and confirm the migrations succeeded. Never reset an existing database just to make this task pass.",
          ],
          result:
            "The development database has the schema the starter expects.",
          commands: [anchor.commands[2]!],
        },
        {
          id: "start",
          title: "Start the local web app",
          instructions: [
            "Run the web development command below and leave that terminal open.",
            "Open the local address printed by the server in your browser. If the usual port is occupied, use the address actually printed.",
            "Confirm the sign-in or landing page loads. Use a second terminal for later commands.",
          ],
          result:
            "The web app opens in your browser at its printed local address.",
          commands: [anchor.commands[3]!],
        },
      ];
      for (const step of steps)
        add(anchor, {
          ...step,
          id: `local.${step.id}`,
          links: [step.id === "start" ? refs.starter : refs.prisma],
        });
      continue;
    }
    if (anchor.id === "local.doctor") {
      add(anchor, {
        id: "local.doctor-export",
        title: "Export one local setup report",
        instructions: [
          "Use a second terminal in the project root. The command below checks local configuration without editing your environment files.",
          "It writes launchpad-report.json. A failed check may give the command a nonzero exit code while still producing a useful report.",
          "Storage checks can write and remove a small probe object. Review that behaviour before checking a sensitive bucket.",
        ],
        result:
          "launchpad-report.json exists and contains the local check results.",
        commands: [anchor.commands[1]!],
        links: [refs.starter],
      });
      add(anchor, {
        id: "local.doctor-import",
        title: "Import and review the local report",
        instructions: [
          "Choose Local in this Launchpad’s Import verification results section and select launchpad-report.json.",
          "Review the service-check tasks once. Warning and Failed are different from Passed imported check; omitted checks stay Not checked.",
          "Resolve the reported issues, export a new report and import it. A local pass does not prove production, backup recovery or complete customer workflows.",
        ],
        result:
          "You have reviewed every applicable check and know which issues remain.",
        links: [refs.starter],
      });
      continue;
    }
    if (anchor.id === "local.backend") {
      add(anchor, {
        id: "local.backend-install",
        title: "Install the Python companion dependencies",
        instructions: [
          "Install Python 3.12 or newer and uv using the linked instructions.",
          "Read apps/backend/README.md, open a terminal in apps/backend and run uv sync.",
          "Create apps/backend/.env from its example. Configure its database and matching shared secret privately; use the web guide’s backend settings task for the web-side address.",
        ],
        result:
          "The Python environment is installed and its private environment file exists.",
        commands: [anchor.commands[0]!],
        links: [refs.python],
      });
      add(anchor, {
        id: "local.backend-start",
        title: "Start the Python API",
        instructions: [
          "Enable pgvector on the database used by agent and RAG features, following your database provider’s extension instructions.",
          "From the project root, run the Python development command below in its own terminal and leave it open.",
          "Use its printed address for the web-side BACKEND_URL, then restart the web app. Run a small agent or ingestion request to check the signed connection.",
        ],
        result: "A signed request reaches the running Python API.",
        commands: [anchor.commands[2]!],
        links: [refs.python, refs.inngest, refs.postgres],
      });
      continue;
    }
    if (anchor.id === "desktop.run" || anchor.id === "mobile.run") {
      const desktop = anchor.id === "desktop.run";
      const app = desktop ? "desktop" : "mobile";
      const key = desktop ? "VITE_API_URL" : "EXPO_PUBLIC_API_URL";
      add(anchor, {
        id: `local.${app}-env`,
        title: `Configure the ${app} API address`,
        instructions: [
          `Copy apps/${app}/.env.example to apps/${app}/.env.`,
          `Set ${key} to the web app’s origin, without /api/trpc at the end.`,
          desktop
            ? "Keep the web app running while using the desktop client."
            : "For a physical phone, use your computer’s reachable LAN address; localhost on the phone refers to the phone, not your computer.",
        ],
        result: `The ${app} client’s API address points to the running web app.`,
        links: [refs[app]],
      });
      add(anchor, {
        id: `local.${app}-start`,
        title: `Start and sign in to the ${app} app`,
        instructions: [
          desktop
            ? "Use the desktop development command below. On Linux, follow AGENTS.md if the Electron binary download was skipped."
            : "Use the Expo start command below, then choose a device or emulator. iOS simulators require macOS.",
          "Open the app and sign in with a test user. Check that it can read data from the web API.",
          "If social sign-in is selected, test the callback back to this client using its configured app scheme.",
        ],
        result: `The ${app} app opens and a test user can access the API.`,
        commands: desktop ? anchor.commands : [anchor.commands[0]!],
        links: [refs[app], refs.auth],
      });
      continue;
    }
    // Reviewed catalog instructions are already bounded actions. Split them into
    // individual steps, keep context in technical details, and retain references.
    const instructions = anchor.presentations.developer.filter(
      (line) =>
        !line.startsWith("Selected modules:") &&
        !line.startsWith("Use the selected modules"),
    );
    const labels: Record<string, string[]> = {
      "mvp.define": [
        "Describe the first useful customer outcome",
        "Map the screens and data for that outcome",
        "Keep later ideas out of the MVP",
      ],
      "mvp.customize": [
        "Replace branding and public copy",
        "Implement the core customer journey",
        "Test the product’s business rules",
      ],
      "mvp.test": [
        "Test a fresh customer’s journey",
        "Test failures and selected devices",
        "Run code and build checks",
      ],
      "mvp.multi_tenancy": [
        "Create two test workspaces and invite a member",
        "Verify workspace data stays private",
      ],
      "mvp.ai": [
        "Check the product uses your chosen AI provider",
        "Test AI requests, failures and cancellation",
      ],
      "mvp.ai_agents": [
        "Test document ingestion and an agent request",
        "Verify queue retries and collection access",
      ],
      "mvp.api_keys": [
        "Test issuing, using and revoking an API key",
        "Test rejected keys, scopes and rate limits",
      ],
      "mvp.jobs": [
        "Choose a product action that runs a background job",
        "Test retries and dead-letter recovery",
      ],
      "mvp.notifications": [
        "Test inbox delivery and channel preferences",
        "Check duplicate notifications are prevented",
      ],
      "mvp.audit_log": [
        "Check committed changes appear in the audit trail",
        "Check redaction and rolled-back changes",
      ],
      "mvp.webhooks": [
        "Confirm the configured webhook encryption key is backed up",
        "Test signed deliveries and unsafe endpoint rejection",
      ],
      "mvp.feature_flags": [
        "Test enabled and disabled feature experiences",
        "Verify access checks on the server",
      ],
      "mvp.onboarding": [
        "Try onboarding with a new test account",
        "Check completion and onboarding preferences",
      ],
      "launch.vercel": [
        "Connect the repository to Vercel",
        "Configure Vercel build and environment settings",
        "Test preview before releasing production",
      ],
      "launch.docker": [
        "Review the production container configuration",
        "Protect persistent data and internal services",
        "Start and inspect the production stack",
      ],
      "launch.backend": [
        "Deploy the Python execution service",
        "Connect the deployed web and Python services",
        "Test the production queue and agent flow",
      ],
      "launch.domain": [
        "Connect DNS and HTTPS",
        "Update the app’s public address",
        "Check redirects and email links",
      ],
      "launch.auth": [
        "Register production sign-in callbacks",
        "Check redirects and native app schemes",
        "Test new and returning users",
      ],
      "launch.email": [
        "Verify the production sending domain",
        "Test verification and recovery emails",
        "Test notification email preferences",
      ],
      "launch.payments": [
        "Configure products and payment callbacks",
        "Test sandbox checkout and duplicate webhooks",
        "Check access and receipts before live payments",
      ],
      "desktop.release": [
        "Set desktop production identity and API",
        "Configure packaging and signing",
        "Test the installer and OAuth return",
        "Review additional distribution requirements",
      ],
      "mobile.release": [
        "Configure Expo production identity and API",
        "Review store accounts and EAS profiles",
        "Build and test release artifacts",
        "Submit and review update requirements",
      ],
      "launch.smoke": [
        "Test the released customer journey",
        "Test authorization and integration failures",
        "Resolve launch blockers",
      ],
      "operate.backups": [
        "Enable backups and choose retention",
        "Practice restoring to an isolated database",
        "Protect file backups and recovery secrets",
      ],
      "operate.monitoring": [
        "Check logging and analytics",
        "Set an uptime check and alert destination",
        "Assign responses for failed jobs and webhooks",
      ],
      "operate.rollback": [
        "Rehearse restoring the previous app version",
        "Review database compatibility for rollback",
        "Document native release recovery",
      ],
      "operate.upgrades": [
        "Review release notes and security advisories",
        "Preview and test an upgrade in a separate branch",
        "Recheck integrations after configuration changes",
      ],
    };
    const links: LaunchpadTask["links"] = anchor.links.length
      ? anchor.links
      : anchor.id.includes("backups")
        ? [refs.backup]
        : anchor.id.includes("auth")
          ? [refs.auth]
          : anchor.id.includes("payments")
            ? [
                project.config.NEXT_PUBLIC_PAYMENT_GATEWAY === "dodo"
                  ? refs.dodo
                  : refs.stripe,
              ]
            : anchor.id.includes("backend")
              ? [refs.python, refs.docker, refs.inngest]
              : anchor.id.includes("jobs") || anchor.id.includes("ai_agents")
                ? [refs.inngest]
                : anchor.id === "mvp.ai"
                  ? [refs.ai]
                  : [refs.starter];
    instructions.forEach((instruction, index) => {
      if (anchor.id === "mvp.ai" && index === 0)
        instruction =
          "Open your product’s AI feature and confirm it offers the provider you already configured during local setup. Make one small request and check that the expected answer appears.";
      if (anchor.id === "mvp.jobs" && index === 0)
        instruction =
          "Choose a real product action that should trigger background work. Perform it with a test account, then check that its result appears once. Use the local queue configuration you already completed.";
      const extra =
        anchor.id === "mvp.customize" && index === 0
          ? "Open /admin/settings for configured branding. Review apps/web/app/landing/page.tsx and the legal pages under apps/web/app/landing/legal."
          : anchor.id === "mvp.customize" && index === 1
            ? "Start with apps/web/app/(home)/page.tsx and apps/web/components/home/AppSidebar.tsx. Product data models live in packages/database/prisma; authorized server procedures live in apps/web/trpc/routers. New product features need your own implementation."
            : `Use the reference below and the relevant starter files. Record the result before moving to the next step.`;
      const attachedCommands =
        anchor.id === "mvp.test" && index === instructions.length - 1
          ? anchor.commands
          : anchor.id === "launch.docker" && index === 2
            ? anchor.commands
            : anchor.id === "desktop.release" && index === 1
              ? anchor.commands
              : anchor.id === "mobile.release" && index === 0
                ? [anchor.commands[0]!]
                : anchor.id === "mobile.release" && index === 2
                  ? anchor.commands.slice(1)
                  : [];
      add(anchor, {
        id: `${anchor.id}.${index + 1}`,
        context: anchor.signature,
        title:
          labels[anchor.id]?.[index] ??
          `${anchor.title}: ${index === 0 ? "set up" : "verify"} ${index + 1}`,
        instructions: [instruction, extra],
        result: `This action is complete and reviewed: ${labels[anchor.id]?.[index] ?? anchor.title}.`,
        commands: attachedCommands,
        links,
        details: anchor.acceptance,
      });
    });
  }
  return tasks;
}
