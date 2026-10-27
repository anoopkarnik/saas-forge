export const featureSectionData = {
  "heading": "Explore what your SaaS can do",
  "description": "A shared foundation, 13 optional modules, and your choice of platforms and providers. Explore what is included, what you can add, and which tools power it.",
  "groups": [
    {
      "key": "foundation",
      "label": "Foundation"
    },
    {
      "key": "monetization",
      "label": "Monetization"
    },
    {
      "key": "users-teams",
      "label": "Users & teams"
    },
    {
      "key": "ai-automation",
      "label": "AI & automation"
    },
    {
      "key": "operations",
      "label": "Operations"
    },
    {
      "key": "platform",
      "label": "SaaS Forge platform"
    }
  ],
  "features": [
    {
      "id": "sf-email",
      "title": "Email",
      "description": "Transactional email templates and delivery for the account flows your product needs.",
      "category": "Foundation",
      "imageUrl": "",
      "sortOrder": 0,
      "details": {
        "key": "email",
        "groupKey": "foundation",
        "icon": "mail",
        "inclusion": "included",
        "bullets": [
          "Send account verification, password reset and invitation emails.",
          "Render reusable React Email templates and deliver through Resend.",
          "Route email through a shared job; add Jobs for queued delivery.",
          "Use the recipient’s locale for translated emails.",
          "Configure a verified sending domain and Resend API key before sending."
        ],
        "toolGroups": [
          {
            "label": "Built with",
            "relationship": "built-with",
            "tools": [
              {
                "name": "Resend",
                "logoUrl": "/cms/tools/resend.svg",
                "url": "https://resend.com"
              },
              {
                "name": "React Email",
                "logoUrl": "/cms/tools/react-email.svg",
                "url": "https://react.email"
              }
            ]
          }
        ],
        "dependencies": [],
        "documentationUrl": "/landing/doc/email"
      }
    },
    {
      "id": "sf-auth",
      "title": "Login",
      "description": "Verified email and password, social sign-in and shared sessions across your selected apps.",
      "category": "Foundation",
      "imageUrl": "/cms/v2/auth.png",
      "sortOrder": 1,
      "details": {
        "key": "auth",
        "groupKey": "foundation",
        "icon": "log-in",
        "inclusion": "included",
        "bullets": [
          "Verify email addresses and provide password reset flows.",
          "Enable Google, GitHub and LinkedIn sign-in with your own OAuth credentials.",
          "Manage account details, passwords and active sessions in Settings.",
          "Enforce roles, invite-only registration and read-only guest access on the server.",
          "Share Better Auth account access across web, desktop and mobile."
        ],
        "toolGroups": [
          {
            "label": "Authentication",
            "relationship": "built-with",
            "tools": [
              {
                "name": "Better Auth",
                "logoUrl": "/cms/tools/better-auth.png",
                "url": "https://www.better-auth.com"
              }
            ]
          },
          {
            "label": "Social sign-in",
            "relationship": "sign-in",
            "tools": [
              {
                "name": "Google",
                "logoUrl": "/cms/tools/google.svg",
                "url": "https://developers.google.com/identity"
              },
              {
                "name": "GitHub",
                "logoUrl": "/cms/tools/github.svg",
                "url": "https://github.com"
              },
              {
                "name": "LinkedIn",
                "logoUrl": "/cms/tools/linkedin.svg",
                "url": "https://www.linkedin.com"
              }
            ]
          }
        ],
        "dependencies": [],
        "documentationUrl": "/landing/doc/authentication-overview"
      }
    },
    {
      "id": "sf-database",
      "title": "Database",
      "description": "A shared PostgreSQL database with Prisma models, typed access and a managed migration workflow.",
      "category": "Foundation",
      "imageUrl": "",
      "sortOrder": 2,
      "details": {
        "key": "database",
        "groupKey": "foundation",
        "icon": "database",
        "inclusion": "included",
        "bullets": [
          "Store users, sessions and selected module data in PostgreSQL.",
          "Use Prisma’s generated client from the shared database package.",
          "Keep models organized in split Prisma schema files.",
          "Seed initial application content and configuration.",
          "Generate and apply migrations through the repository’s database commands."
        ],
        "toolGroups": [
          {
            "label": "Built with",
            "relationship": "built-with",
            "tools": [
              {
                "name": "PostgreSQL",
                "logoUrl": "/cms/tools/postgresql.svg",
                "url": "https://www.postgresql.org"
              },
              {
                "name": "Prisma",
                "logoUrl": "/cms/tools/prisma.svg",
                "url": "https://www.prisma.io"
              }
            ]
          }
        ],
        "dependencies": [],
        "documentationUrl": "/landing/doc/postgres"
      }
    },
    {
      "id": "sf-storage",
      "title": "Storage",
      "description": "Validated image uploads for avatars and CMS content, with your choice of storage provider.",
      "category": "Foundation",
      "imageUrl": "/cms/v2/storage.png",
      "sortOrder": 3,
      "details": {
        "key": "storage",
        "groupKey": "foundation",
        "icon": "hard-drive",
        "inclusion": "included",
        "bullets": [
          "Choose Cloudflare R2 or Vercel Blob for image storage.",
          "Validate actual PNG, JPEG and WebP content before accepting uploads.",
          "Re-encode images to strip metadata and apply orientation.",
          "Apply role, rate and file-size checks to upload routes.",
          "Store images under generated keys and return their public URLs."
        ],
        "toolGroups": [
          {
            "label": "Choose one storage provider",
            "relationship": "choose-one",
            "tools": [
              {
                "name": "Cloudflare R2",
                "logoUrl": "/cms/tools/cloudflare.svg",
                "url": "https://developers.cloudflare.com/r2"
              },
              {
                "name": "Vercel Blob",
                "logoUrl": "/cms/tools/vercel.svg",
                "url": "https://vercel.com/storage/blob"
              }
            ]
          }
        ],
        "dependencies": [],
        "documentationUrl": "/landing/doc/storage"
      }
    },
    {
      "id": "sf-cms",
      "title": "CMS",
      "description": "Edit landing content and Markdown documentation in the admin CMS, or keep them in versioned constants.",
      "category": "Foundation",
      "imageUrl": "/cms/v2/cms.png",
      "sortOrder": 4,
      "details": {
        "key": "cms",
        "groupKey": "foundation",
        "icon": "file-text",
        "inclusion": "included",
        "bullets": [
          "Choose PostgreSQL-backed content or constants stored in source control.",
          "Manage landing sections, pricing, FAQs and testimonials.",
          "Create and edit Markdown documentation with the admin editor.",
          "Upload CMS images through the configured image storage provider.",
          "Protect content changes with server-side admin authorization."
        ],
        "toolGroups": [],
        "dependencies": [],
        "documentationUrl": "/landing/doc/content-management"
      }
    },
    {
      "id": "sf-platform",
      "title": "Web / Desktop / Mobile",
      "description": "Next.js, Electron and Expo clients in one TypeScript monorepo, selected for the platforms you need.",
      "category": "Foundation",
      "imageUrl": "/cms/v2/platform.png",
      "sortOrder": 5,
      "details": {
        "key": "platform",
        "groupKey": "foundation",
        "icon": "monitor-smartphone",
        "inclusion": "included",
        "bullets": [
          "Build a Next.js web application with a typed tRPC API.",
          "Include an Electron desktop client and an Expo mobile client as needed.",
          "Share authentication, data access and reusable packages.",
          "Keep account operations behind the web API’s authorization checks.",
          "Download only the selected platforms alongside the shared foundation."
        ],
        "toolGroups": [
          {
            "label": "Platform frameworks",
            "relationship": "built-with",
            "tools": [
              {
                "name": "Next.js",
                "logoUrl": "/cms/tools/nextjs.svg",
                "url": "https://nextjs.org"
              },
              {
                "name": "Electron",
                "logoUrl": "/cms/tools/electron.svg",
                "url": "https://www.electronjs.org"
              },
              {
                "name": "Expo",
                "logoUrl": "/cms/tools/expo.svg",
                "url": "https://expo.dev"
              }
            ]
          }
        ],
        "dependencies": [],
        "documentationUrl": "/landing/doc/architecture"
      }
    },
    {
      "id": "sf-billing",
      "title": "Payments",
      "description": "Checkout, credit purchases and transaction history using Stripe or Dodo Payments.",
      "category": "Monetization",
      "imageUrl": "/cms/v2/billing.png",
      "sortOrder": 6,
      "details": {
        "key": "billing",
        "groupKey": "monetization",
        "icon": "credit-card",
        "inclusion": "optional",
        "bullets": [
          "Choose Stripe or Dodo Payments as your payment gateway.",
          "Let users purchase credits through checkout.",
          "Record payment transactions and show account history.",
          "Verify payment callbacks before changing account balances.",
          "Prevent duplicate webhook events from crediting the account twice."
        ],
        "toolGroups": [
          {
            "label": "Choose one payment provider",
            "relationship": "choose-one",
            "tools": [
              {
                "name": "Stripe",
                "logoUrl": "/cms/tools/stripe.svg",
                "url": "https://stripe.com"
              },
              {
                "name": "Dodo Payments",
                "logoUrl": "/cms/tools/dodo-payments.png",
                "url": "https://dodopayments.com"
              }
            ]
          }
        ],
        "dependencies": [],
        "documentationUrl": "/landing/doc/payments"
      }
    },
    {
      "id": "sf-usage",
      "title": "Usage & credits",
      "description": "Explain credit spend with a per-meter ledger, balance history and threshold alerts.",
      "category": "Monetization",
      "imageUrl": "",
      "sortOrder": 7,
      "details": {
        "key": "usage",
        "groupKey": "monetization",
        "icon": "chart-no-axes-combined",
        "inclusion": "optional",
        "bullets": [
          "Included with the Billing & Payments module.",
          "Show spend by meter, rate descriptions and balance history on /usage.",
          "Record usage and credit charges in the same transaction.",
          "Deduplicate repeated usage events with idempotency keys.",
          "Announce crossed 80% and 95% usage thresholds.",
          "Reconcile ledger totals through a scheduled job when Jobs is selected."
        ],
        "toolGroups": [],
        "dependencies": [],
        "documentationUrl": "/landing/doc/usage-ledger"
      }
    },
    {
      "id": "sf-multi-tenancy",
      "title": "Organizations",
      "description": "Workspaces, member invitations and team roles with server-side access checks.",
      "category": "Users & teams",
      "imageUrl": "/cms/v2/multi-tenancy.png",
      "sortOrder": 8,
      "details": {
        "key": "multi-tenancy",
        "groupKey": "users-teams",
        "icon": "users",
        "inclusion": "optional",
        "bullets": [
          "Create workspaces and switch between your organizations.",
          "Invite teammates and manage workspace membership.",
          "Assign owner, admin, member and viewer roles.",
          "Enforce workspace permissions on the server.",
          "Show workspace activity when Audit log is selected."
        ],
        "toolGroups": [],
        "dependencies": [],
        "documentationUrl": "/landing/doc/organizations"
      }
    },
    {
      "id": "sf-onboarding",
      "title": "Onboarding",
      "description": "A skippable welcome wizard and a setup checklist that follows your selected modules.",
      "category": "Users & teams",
      "imageUrl": "/cms/v2/onboarding.png",
      "sortOrder": 9,
      "details": {
        "key": "onboarding",
        "groupKey": "users-teams",
        "icon": "list-checks",
        "inclusion": "optional",
        "bullets": [
          "Welcome new users without blocking access to the application.",
          "Show setup tasks for the modules included in your product.",
          "Check real progress such as an avatar, API key or first conversation.",
          "Let users disable the wizard and checklist in Settings.",
          "Backfill existing users when adding onboarding to a live app."
        ],
        "toolGroups": [],
        "dependencies": [],
        "documentationUrl": "/landing/doc/onboarding"
      }
    },
    {
      "id": "sf-notifications",
      "title": "Notifications",
      "description": "An in-app inbox and email preferences across web, desktop and mobile.",
      "category": "Users & teams",
      "imageUrl": "/cms/v2/notifications.png",
      "sortOrder": 10,
      "details": {
        "key": "notifications",
        "groupKey": "users-teams",
        "icon": "bell",
        "inclusion": "optional",
        "bullets": [
          "Show an unread bell and inbox across the selected clients.",
          "Let users choose in-app and email channels by notification type.",
          "Include payment, low-credit and invitation events with their modules.",
          "Deduplicate notifications and emit them after the product change commits.",
          "Deliver email through the shared job system; add Jobs for durable delivery."
        ],
        "toolGroups": [],
        "dependencies": [],
        "documentationUrl": "/landing/doc/notifications"
      }
    },
    {
      "id": "sf-ai",
      "title": "AI chat & voice",
      "description": "Streaming chat, versioned prompts, speech and token-aware metering across configured model providers.",
      "category": "AI & automation",
      "imageUrl": "/cms/v2/ai.png",
      "sortOrder": 11,
      "details": {
        "key": "ai",
        "groupKey": "ai-automation",
        "icon": "sparkles",
        "inclusion": "optional",
        "bullets": [
          "Stream chat replies and retain conversation history.",
          "Manage prompt versions and model choices from the admin panel.",
          "Use speech-to-text input and text-to-speech replies.",
          "Meter input and output tokens across tool-loop steps.",
          "Connect server-configured remote MCP tools for chat.",
          "Configure supported providers including OpenAI, Anthropic and Google."
        ],
        "toolGroups": [
          {
            "label": "Supported model providers",
            "relationship": "compatible",
            "tools": [
              {
                "name": "OpenAI",
                "logoUrl": "/cms/tools/openai.svg",
                "url": "https://openai.com"
              },
              {
                "name": "Anthropic",
                "logoUrl": "/cms/tools/anthropic.svg",
                "url": "https://www.anthropic.com"
              },
              {
                "name": "Google",
                "logoUrl": "/cms/tools/google.svg",
                "url": "https://developers.google.com/identity"
              }
            ]
          }
        ],
        "dependencies": [],
        "documentationUrl": "/landing/doc/ai-platform"
      }
    },
    {
      "id": "sf-ai-agents",
      "title": "Agents & RAG",
      "description": "Signed Python execution APIs for LangGraph agents and retrieval, orchestrated by web background jobs.",
      "category": "AI & automation",
      "imageUrl": "/cms/v2/ai-agents.png",
      "sortOrder": 12,
      "details": {
        "key": "ai-agents",
        "groupKey": "ai-automation",
        "icon": "bot",
        "inclusion": "optional",
        "bullets": [
          "Build on a FastAPI execution service and LangGraph agents.",
          "Stream agent events or run work through web Inngest functions.",
          "Ingest document collections and retrieve with pgvector or Qdrant.",
          "Sign requests between the web application and Python backend.",
          "Build your own product screens on the supplied APIs and pipelines."
        ],
        "toolGroups": [
          {
            "label": "Execution service",
            "relationship": "built-with",
            "tools": [
              {
                "name": "FastAPI",
                "logoUrl": "/cms/tools/fastapi.svg",
                "url": "https://fastapi.tiangolo.com"
              }
            ]
          }
        ],
        "dependencies": [
          "ai",
          "jobs"
        ],
        "documentationUrl": "/landing/doc/ai-agents"
      }
    },
    {
      "id": "sf-jobs",
      "title": "Background jobs",
      "description": "Typed work, retries, deduplication and scheduled tasks with failure inspection and replay.",
      "category": "AI & automation",
      "imageUrl": "/cms/v2/jobs.png",
      "sortOrder": 13,
      "details": {
        "key": "jobs",
        "groupKey": "ai-automation",
        "icon": "clock",
        "inclusion": "optional",
        "bullets": [
          "Define typed payloads and handlers with configurable retries.",
          "Enqueue work with delays and deduplication keys.",
          "Run cron schedules with one execution per schedule window.",
          "Inspect and replay dead letters from the admin jobs page.",
          "Use Inngest for queued execution or the inline fallback locally."
        ],
        "toolGroups": [
          {
            "label": "Queue provider",
            "relationship": "built-with",
            "tools": [
              {
                "name": "Inngest",
                "logoUrl": "/cms/tools/inngest.svg",
                "url": "https://www.inngest.com"
              }
            ]
          }
        ],
        "dependencies": [],
        "documentationUrl": "/landing/doc/background-jobs"
      }
    },
    {
      "id": "sf-mcp",
      "title": "MCP",
      "description": "Read-only account tools for compatible AI clients, authenticated with scoped API keys.",
      "category": "AI & automation",
      "imageUrl": "/cms/v2/mcp.png",
      "sortOrder": 14,
      "details": {
        "key": "mcp",
        "groupKey": "ai-automation",
        "icon": "plug",
        "inclusion": "optional",
        "bullets": [
          "Serve stateless Streamable HTTP at /api/mcp.",
          "Authenticate requests with expiring, revocable and rate-limited API keys.",
          "Expose tools based on selected modules, including account and usage reads.",
          "Validate each tool input and required scope on the server.",
          "Keep credit-spending and destructive actions outside model-invoked tools."
        ],
        "toolGroups": [],
        "dependencies": [
          "api-keys"
        ],
        "documentationUrl": "/landing/doc/mcp"
      }
    },
    {
      "id": "sf-api-keys",
      "title": "API keys",
      "description": "Scoped, revocable credentials for authenticated REST access to a user’s account.",
      "category": "Operations",
      "imageUrl": "/cms/v2/api-keys.png",
      "sortOrder": 15,
      "details": {
        "key": "api-keys",
        "groupKey": "operations",
        "icon": "key-round",
        "inclusion": "optional",
        "bullets": [
          "Create API keys from Settings with an expiry and selected scopes.",
          "Hash credentials at rest and show a new key only when created.",
          "Revoke access without changing the user’s password.",
          "Enforce per-key rate limits, scopes and expiry on API requests.",
          "Read the key owner’s profile through /api/v1/me."
        ],
        "toolGroups": [],
        "dependencies": [],
        "documentationUrl": "/landing/doc/api-keys"
      }
    },
    {
      "id": "sf-webhooks",
      "title": "Webhooks",
      "description": "Versioned outgoing events with signed delivery, replay and customer-managed endpoints.",
      "category": "Operations",
      "imageUrl": "/cms/v2/webhooks.png",
      "sortOrder": 16,
      "details": {
        "key": "webhooks",
        "groupKey": "operations",
        "icon": "webhook",
        "inclusion": "optional",
        "bullets": [
          "Let customers subscribe endpoints to supported product events.",
          "Sign requests with HMAC-SHA256 and support secret rotation.",
          "Retry failed deliveries through Inngest for about 24 hours.",
          "Inspect delivery logs, replay events and pause repeatedly failing endpoints.",
          "Check endpoint URLs against private networks at save and connection time."
        ],
        "toolGroups": [],
        "dependencies": [
          "jobs"
        ],
        "documentationUrl": "/landing/doc/outgoing-webhooks"
      }
    },
    {
      "id": "sf-feature-flags",
      "title": "Feature flags",
      "description": "Server-evaluated rollouts with targeting rules, previews and change history.",
      "category": "Operations",
      "imageUrl": "/cms/v2/feature-flags.png",
      "sortOrder": 17,
      "details": {
        "key": "feature-flags",
        "groupKey": "operations",
        "icon": "flag",
        "inclusion": "optional",
        "bullets": [
          "Define per-user flags with code defaults.",
          "Target by role, user or stable percentage, plus workspace with Organizations.",
          "Evaluate ordered rules on the server and hydrate only their results.",
          "Enforce flags in procedures and route handlers as well as the UI.",
          "Edit rules, preview a user and review history in the admin panel."
        ],
        "toolGroups": [],
        "dependencies": [],
        "documentationUrl": "/landing/doc/feature-flags"
      }
    },
    {
      "id": "sf-audit-log",
      "title": "Audit log",
      "description": "An append-only record of important changes with redacted metadata, filters and CSV export.",
      "category": "Operations",
      "imageUrl": "/cms/v2/audit-log.png",
      "sortOrder": 18,
      "details": {
        "key": "audit-log",
        "groupKey": "operations",
        "icon": "scroll-text",
        "inclusion": "optional",
        "bullets": [
          "Record admin, workspace, API key, CMS and prompt changes for selected modules.",
          "Redact secret-looking fields and keep only declared metadata.",
          "Commit audit events with the application changes where supported.",
          "Filter and export the admin audit trail as CSV.",
          "Show organization activity and configure retention; scheduled cleanup uses Jobs."
        ],
        "toolGroups": [],
        "dependencies": [],
        "documentationUrl": "/landing/doc/audit-log"
      }
    },
    {
      "id": "sf-analytics",
      "title": "Analytics",
      "description": "Typed product events with PostHog, privacy controls and optional consent.",
      "category": "Operations",
      "imageUrl": "/cms/v2/analytics.png",
      "sortOrder": 19,
      "details": {
        "key": "analytics",
        "groupKey": "operations",
        "icon": "chart-column",
        "inclusion": "optional",
        "bullets": [
          "Track declared product events from browser and server code.",
          "Send identifiers, counts and enums instead of names or email addresses.",
          "Respect Do Not Track, Global Privacy Control and declined consent.",
          "Enable an optional consent banner before PostHog loads.",
          "Keep autocapture and session recording disabled.",
          "Use console logging in development when PostHog is not configured."
        ],
        "toolGroups": [
          {
            "label": "Analytics provider",
            "relationship": "built-with",
            "tools": [
              {
                "name": "PostHog",
                "logoUrl": "/cms/tools/posthog.svg",
                "url": "https://posthog.com"
              }
            ]
          }
        ],
        "dependencies": [],
        "documentationUrl": "/landing/doc/product-analytics"
      }
    },
    {
      "id": "sf-settings",
      "title": "Runtime settings",
      "description": "Change public product settings from the admin panel without redeploying.",
      "category": "Operations",
      "imageUrl": "/cms/v2/settings.png",
      "sortOrder": 20,
      "details": {
        "key": "settings",
        "groupKey": "operations",
        "icon": "settings",
        "inclusion": "included",
        "bullets": [
          "Use environment values as defaults and save runtime overrides in PostgreSQL.",
          "Edit branding, themes, registration controls and other public settings.",
          "Validate every setting against its declared schema.",
          "Refresh cached settings after admin changes.",
          "Keep credentials and secret values in environment files."
        ],
        "toolGroups": [],
        "dependencies": [],
        "documentationUrl": "/landing/doc/runtime-settings"
      }
    },
    {
      "id": "sf-localization",
      "title": "Localization",
      "description": "English and Spanish message catalogs across the app and recipient-aware email templates.",
      "category": "Operations",
      "imageUrl": "",
      "sortOrder": 21,
      "details": {
        "key": "localization",
        "groupKey": "operations",
        "icon": "languages",
        "inclusion": "included",
        "bullets": [
          "Resolve locale from user preference, cookie, browser language and site default.",
          "Translate the supported app surfaces without locale URL prefixes.",
          "Format dates and money for the active locale.",
          "Check message keys, ICU syntax and placeholders across catalogs.",
          "Send translated email using the recipient’s locale."
        ],
        "toolGroups": [],
        "dependencies": [],
        "documentationUrl": "/landing/doc/internationalization"
      }
    },
    {
      "id": "sf-launchpad",
      "title": "Launchpad",
      "description": "A project-specific path from downloaded starter to launch, available in the SaaS Forge platform.",
      "category": "SaaS Forge platform",
      "imageUrl": "/cms/v2/launchpad.png",
      "sortOrder": 22,
      "details": {
        "key": "launchpad",
        "groupKey": "platform",
        "icon": "rocket",
        "inclusion": "platform",
        "bullets": [
          "Follow curated phases for local setup, MVP work, launch and operations.",
          "Filter guidance by saved modules, providers, platforms and deployment choice.",
          "Track completed work with documentation links and troubleshooting notes.",
          "Export the walkthrough to Markdown and include it in SETUP.md.",
          "Ask for optional AI help on a selected task.",
          "Available in SaaS Forge My Projects; not shipped as a starter module."
        ],
        "toolGroups": [],
        "dependencies": [],
        "documentationUrl": "/landing/doc/launchpad"
      }
    },
    {
      "id": "sf-upgrades",
      "title": "Project upgrades",
      "description": "Review releases and file deltas for your saved projects in SaaS Forge or the CLI.",
      "category": "SaaS Forge platform",
      "imageUrl": "/cms/v2/upgrades.png",
      "sortOrder": 23,
      "details": {
        "key": "upgrades",
        "groupKey": "platform",
        "icon": "refresh-cw",
        "inclusion": "platform",
        "bullets": [
          "Review release notes filtered to the modules a saved project contains.",
          "Get free release kits for code already owned when snapshots are available.",
          "Preview files and prices before adding paid modules or changing stages.",
          "Switch providers with free, reviewable upgrade kits.",
          "Merge staged deltas into custom code and verify before marking current.",
          "Managed by the SaaS Forge platform; not a module shipped in your product."
        ],
        "toolGroups": [],
        "dependencies": [],
        "documentationUrl": "/landing/doc/upgrading"
      }
    }
  ]
};
