export const featureSectionData = {
  heading: "Build on the features your SaaS needs",
  description:
    "A shared foundation, 13 optional modules, and your choice of platforms and providers. The source repository includes every module; each downloaded starter contains your selection.",
  features: [
    {
      id: "sf-platform",
      title: "Web, desktop and mobile",
      description:
        "Start with Next.js, Electron and Expo in one TypeScript monorepo. Share auth, a typed tRPC API and reusable UI while choosing which clients to include.",
      imageUrl: "/cms/v2/platform.png",
      category: "Core",
    },
    {
      id: "sf-auth",
      title: "Authentication and access",
      description:
        "Better Auth powers verified email sign-up, password reset and Google, GitHub and LinkedIn sign-in. Manage roles, invitations, invite-only registration and a read-only demo account.",
      imageUrl: "/cms/v2/auth.png",
      category: "Core",
    },
    {
      id: "sf-billing",
      title: "Billing and usage you can explain",
      description:
        "Offer Stripe or Dodo checkout, credit purchases and transaction history. Track spend by meter in the usage ledger, with balance history and alerts at 80% and 95%.",
      imageUrl: "/cms/v2/billing.png",
      category: "Optional module",
    },
    {
      id: "sf-multi-tenancy",
      title: "Organizations and team roles",
      description:
        "Create workspaces, invite teammates and switch organizations. Owner, admin, member and viewer roles keep workspace actions behind server-side access checks.",
      imageUrl: "/cms/v2/multi-tenancy.png",
      category: "Optional module",
    },
    {
      id: "sf-ai",
      title: "AI chat, prompts and voice",
      description:
        "Build on streaming chat, versioned prompts, multiple model providers, speech input and spoken replies. Token-aware metering accounts for tool-loop usage, with optional remote MCP tools.",
      imageUrl: "/cms/v2/ai.png",
      category: "Optional module",
    },
    {
      id: "sf-ai-agents",
      title: "Agents and retrieval with Python",
      description:
        "Run LangGraph agents and RAG collections on a signed FastAPI execution service. Web Inngest functions dispatch background work; pgvector supports retrieval. Requires AI Platform and Jobs.",
      imageUrl: "/cms/v2/ai-agents.png",
      category: "Optional module",
    },
    {
      id: "sf-jobs",
      title: "Background jobs and schedules",
      description:
        "Define typed jobs with retries, deduplication and cron schedules. Inngest runs queued work, while admins inspect and replay dead letters; development can run jobs inline.",
      imageUrl: "/cms/v2/jobs.png",
      category: "Optional module",
    },
    {
      id: "sf-notifications",
      title: "Notifications across your app",
      description:
        "Give users an in-app bell, inbox and per-type email preferences across web, desktop and mobile. Payment, low-credit and invitation events use deduplication and queued email delivery.",
      imageUrl: "/cms/v2/notifications.png",
      category: "Optional module",
    },
    {
      id: "sf-audit-log",
      title: "An audit trail for important changes",
      description:
        "Record admin, workspace, API-key, CMS and prompt changes with redacted metadata. Filter and export the admin trail, show workspace activity and configure retention.",
      imageUrl: "/cms/v2/audit-log.png",
      category: "Optional module",
    },
    {
      id: "sf-webhooks",
      title: "Signed outgoing webhooks",
      description:
        "Let customers subscribe their endpoints to versioned events. HMAC signatures, secret rotation, delivery logs and replay are included; Inngest enables retries over about 24 hours. Requires Jobs.",
      imageUrl: "/cms/v2/webhooks.png",
      category: "Optional module",
    },
    {
      id: "sf-feature-flags",
      title: "Controlled feature rollouts",
      description:
        "Target features by role, user, workspace or a stable percentage. Preview rules and review history in the admin panel, with server enforcement as well as UI controls.",
      imageUrl: "/cms/v2/feature-flags.png",
      category: "Optional module",
    },
    {
      id: "sf-onboarding",
      title: "A useful first-run experience",
      description:
        "Welcome users with a skippable wizard and module-aware setup checklist. Tasks check real data where possible, and users can turn the wizard and checklist off in Settings.",
      imageUrl: "/cms/v2/onboarding.png",
      category: "Optional module",
    },
    {
      id: "sf-analytics",
      title: "Product analytics with consent controls",
      description:
        "Track typed product events with PostHog and an optional consent banner. Events use ids, counts and enums; Do Not Track and Global Privacy Control are respected, with no autocapture or session recording.",
      imageUrl: "/cms/v2/analytics.png",
      category: "Optional module",
    },
    {
      id: "sf-api-keys",
      title: "Scoped API keys",
      description:
        "Let users create revocable, expiring API keys in Settings. Keys are hashed at rest and checked for scopes and per-key rate limits before REST API access.",
      imageUrl: "/cms/v2/api-keys.png",
      category: "Optional module",
    },
    {
      id: "sf-mcp",
      title: "Connect AI clients to your product",
      description:
        "Expose read-only account tools through /api/mcp using scoped API keys. The selected modules determine the available tools for profile, credits, usage, workspaces and notifications. Requires API Keys.",
      imageUrl: "/cms/v2/mcp.png",
      category: "Optional module",
    },
    {
      id: "sf-cms",
      title: "Landing pages and documentation",
      description:
        "Edit the landing site and Markdown docs in the Postgres admin CMS, or keep content in versioned constants. Add local images, legal pages and documentation without a separate CMS service.",
      imageUrl: "/cms/v2/cms.png",
      category: "Core",
    },
    {
      id: "sf-settings",
      title: "Runtime settings and localization",
      description:
        "Change branding, themes, registration and other public settings from the admin panel. English and Spanish message catalogs support the app, with recipient-aware email locales. Secrets stay in environment files.",
      imageUrl: "/cms/v2/settings.png",
      category: "Core",
    },
    {
      id: "sf-storage",
      title: "Storage and production controls",
      description:
        "Choose Vercel Blob or Cloudflare R2 for validated images. Route policies, environment validation, redacted logs and optional Upstash caching and rate limits support deployment.",
      imageUrl: "/cms/v2/storage.png",
      category: "Core",
    },
    {
      id: "sf-launchpad",
      title: "From downloaded starter to launch",
      description:
        "Saved projects get a curated Launchpad for running locally, building an MVP, launching and operating. Steps follow the chosen modules, providers and platforms, with documentation links and optional AI help.",
      imageUrl: "/cms/v2/launchpad.png",
      category: "SaaS Forge platform",
    },
    {
      id: "sf-upgrades",
      title: "Keep your project current",
      description:
        "Review module-specific release notes and upgrade previews in My Projects or the CLI. Free release kits update code you already own; paid module additions and free provider switches use reviewable file deltas.",
      imageUrl: "/cms/v2/upgrades.png",
      category: "SaaS Forge platform",
    },
  ],
};
