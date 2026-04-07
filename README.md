<div align="center">

# SaaS Forge

### Source repo and shipped starter for a full-stack SaaS boilerplate

[![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)](https://github.com/anoopkarnik/saas-forge)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node Version](https://img.shields.io/badge/node-%3E%3D20-brightgreen)](https://nodejs.org)
[![pnpm](https://img.shields.io/badge/pnpm-10.4.1-orange.svg)](https://pnpm.io)

[What Ships Today](#-what-ships-today) •
[Choose Your Path](#-choose-your-path) •
[Quick Start](#-quick-start) •
[Environment](#-environment) •
[Commands](#-commands)

</div>

SaaS Forge is a `pnpm` + `Turborepo` monorepo. This repository is the source of truth for the web app, desktop app, mobile app, shared auth/database/UI packages, and the scaffold/download flow. The shipped starter lives at `templates/saas-boilerplate` and is kept in lockstep with the shared SaaS code.

This README documents what is shipped today. It intentionally focuses on the live source repo and the released SaaS starter template. Other directories inside `templates/` are not documented here because they are not part of the released template workflow yet.

## ✨ What Ships Today

- **Web app**: Next.js 15 app with auth flows, landing pages, Notion-backed documentation, legal pages, admin CMS, user management, uploads, payment webhooks, and the SaaS scaffold/download API.
- **Desktop app**: Electron app with auth, documentation viewer, support surfaces, admin user management, and CMS screens.
- **Mobile app**: Expo app with auth, documentation viewer, settings, support flows, and admin screens.
- **Shared platform modules**: Better Auth, tRPC, Prisma/Postgres, Notion CMS utilities, React Email/Resend, shared UI components, Blob/R2 storage, BetterStack logging, Google Analytics, and Upstash rate limiting.
- **Starter template workflow**: `templates/saas-boilerplate`, `template-overrides/saas-boilerplate`, and the clean staged copy at `.generated/saas-boilerplate`.

## 🧭 Choose Your Path

### Use the full source repo

Choose this if you want the scaffold/download system, all three apps, and the shared packages.

### Use the shipped SaaS starter

Choose this if you want to validate or inspect the clean SaaS starter that the scaffold flow packages from `templates/saas-boilerplate`.

## 🚀 Quick Start

### Bootstrap the full repo with the CLI

```bash
npx saas-forge my-saas-app
cd my-saas-app

# review and fill in apps/web/.env
pnpm generate
pnpm migrate
pnpm seed
pnpm dev
```

The CLI clones this repository, copies `apps/web/.env.example` to `apps/web/.env`, and installs dependencies for you.

### Clone and run the full repo manually

```bash
git clone https://github.com/anoopkarnik/saas-forge.git
cd saas-forge
pnpm install

# Linux only: if Electron fails to start because the binary was skipped
node node_modules/.pnpm/electron@<version>/node_modules/electron/install.js

cp apps/web/.env.example apps/web/.env
pnpm generate
pnpm migrate
pnpm seed
pnpm dev
```

If you plan to run the native clients too, review `apps/desktop/.env.example` and `apps/mobile/.env.example` after the web env is set up.

### Validate the shipped SaaS starter locally

```bash
pnpm template:check-sync
pnpm template:prepare
pnpm template:build
```

`template:prepare` stages a clean copy of the starter into `.generated/saas-boilerplate`, installs its dependencies, and runs Prisma generate before building or testing it.

Default local URLs:

| Surface | URL | Notes |
|---|---|---|
| Web | `http://localhost:3000` | Next.js app |
| Desktop renderer | `http://localhost:5173` | Electron renderer dev server |
| Mobile web preview | `http://localhost:8081` | Expo web preview |

## ⚙️ Environment

The canonical config surface for the root repo is [`apps/web/.env.example`](apps/web/.env.example). The scaffold/download flow uses the same model to populate the starter template and the mobile/desktop env files.

Start by copying:

```bash
cp apps/web/.env.example apps/web/.env

# optional: review native/client defaults too
cp apps/desktop/.env.example apps/desktop/.env
cp apps/mobile/.env.example apps/mobile/.env
cp packages/database/.env.example packages/database/.env
```

Then fill in the modules you plan to use:

```env
## PROJECT
NEXT_PUBLIC_THEME=
NEXT_PUBLIC_SAAS_NAME=
NEXT_PUBLIC_COMPANY_NAME=
NEXT_PUBLIC_URL=
NEXT_PUBLIC_THEME_TYPE="dark"

## CMS / DOCUMENTATION
NEXT_PUBLIC_CMS="notion"
LANDING_DATABASE_ID=
HERO_DATABASE_ID=
FEATURE_DATABASE_ID=
TESTIMONIAL_DATABASE_ID=
PRICING_DATABASE_ID=
FAQ_DATABASE_ID=
FOOTER_DATABASE_ID=
DOCUMENTATION_DATABASE_ID=
NOTION_API_TOKEN=

## AUTH
NEXT_PUBLIC_AUTH_FRAMEWORK="better-auth"
NEXT_PUBLIC_AUTH_EMAIL=true
NEXT_PUBLIC_AUTH_GOOGLE=false
NEXT_PUBLIC_AUTH_GITHUB=false
NEXT_PUBLIC_AUTH_LINKEDIN=false
BETTER_AUTH_SECRET=
AUTH_GITHUB_CLIENT_ID=
AUTH_GITHUB_CLIENT_SECRET=
AUTH_GOOGLE_CLIENT_ID=
AUTH_GOOGLE_CLIENT_SECRET=
AUTH_LINKEDIN_CLIENT_ID=
AUTH_LINKEDIN_CLIENT_SECRET=
RESEND_API_KEY=

## SUPPORT
NEXT_PUBLIC_SUPPORT_MAIL=
NEXT_PUBLIC_CALENDLY_BOOKING_URL=
NEXT_PUBLIC_EMAIL_CLIENT="none"

## STORAGE / DATA
NEXT_PUBLIC_IMAGE_STORAGE="vercel_blob"
BLOB_READ_WRITE_TOKEN=
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=
NEXT_PUBLIC_R2_PUBLIC_URL=
DATABASE_URL=
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=

## OBSERVABILITY
NEXT_PUBLIC_ALLOW_RATE_LIMIT="upstash"
BETTERSTACK_TELEMETRY_SOURCE_TOKEN=
BETTERSTACK_TELEMETRY_INGESTING_HOST=
NEXT_PUBLIC_GOOGLE_ANALYTICS_MEASUREMENT_ID=

## PAYMENTS
NEXT_PUBLIC_PAYMENT_GATEWAY=
DODO_PAYMENTS_API_KEY=
DODO_PAYMENTS_WEBHOOK_KEY=
DODO_PAYMENTS_RETURN_URL=
DODO_PAYMENTS_ENVIRONMENT=
DODO_CREDITS_PRODUCT_ID=
NEXT_PUBLIC_DODO_PAYMENTS_URL=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
```

Also see:

- [`apps/web/.env.example`](apps/web/.env.example)
- [`apps/desktop/.env.example`](apps/desktop/.env.example)
- [`apps/mobile/.env.example`](apps/mobile/.env.example)
- [`packages/database/.env.example`](packages/database/.env.example)

## 🧱 Project Layout

```text
saas-forge/
├── apps/
│   ├── web/                  # Next.js app + scaffold/download API
│   ├── desktop/              # Electron app
│   └── mobile/               # Expo app
├── packages/
│   ├── auth/                 # Better Auth setup and clients
│   ├── cms/                  # Notion CMS utilities
│   ├── database/             # Prisma schema, client, and seed scripts
│   ├── email/                # Resend + React Email integration
│   ├── observability/        # Logging utilities
│   └── ui/                   # Shared UI components, blocks, and helpers
├── scripts/
│   ├── cli.js                # Repo bootstrap CLI
│   ├── bump-template-version.mjs
│   │                         # Boilerplate version bump + template restage
│   ├── publish-template-branch.mjs
│   │                         # Publish template branch and version tag
│   └── sync-template.mjs     # Root-to-template sync tool
├── templates/
│   └── saas-boilerplate/     # Shipped SaaS starter source
├── template-overrides/
│   └── saas-boilerplate/     # Intentional starter-only differences
└── .generated/
    └── saas-boilerplate/     # Clean staged starter used for validation/builds
```

Only `templates/saas-boilerplate` is part of the released template workflow today. Other directories inside `templates/` are not documented here because they are not user-ready.

## 🧪 Commands

### Root workspace

| Task | Command |
|---|---|
| Start all apps | `pnpm dev` |
| Build all workspaces | `pnpm build` |
| Lint all workspaces | `pnpm lint` |
| Run all tests | `pnpm test` |
| Run coverage | `pnpm test:coverage` |
| Format Markdown/TS/TSX | `pnpm format` |

### Single app or package checks

| Task | Command |
|---|---|
| Web dev | `pnpm --dir apps/web dev` |
| Web build | `pnpm --dir apps/web build` |
| Web typecheck | `pnpm --dir apps/web typecheck` |
| Mobile dev | `pnpm --dir apps/mobile dev` |
| Desktop dev | `pnpm --dir apps/desktop dev` |
| Desktop install (Linux) | `pnpm desktop:install:linux` |
| Desktop publish (Linux/Edge) | `pnpm desktop:publish:linux:edge` |
| CMS package tests | `pnpm --filter @workspace/cms test` |

### Database

| Task | Command |
|---|---|
| Generate Prisma client | `pnpm generate` |
| Run local migrations | `pnpm migrate` |
| Seed database | `pnpm seed` |
| Reset database | `pnpm reset` |

### Starter template workflow

| Task | Command |
|---|---|
| Sync template from root | `pnpm template:sync` |
| Check template drift | `pnpm template:check-sync` |
| Stage clean starter copy | `pnpm template:stage` |
| Bump versions across workspace | `pnpm version:bump <semver>` |
| Stage + install + Prisma generate | `pnpm template:prepare` |
| Build staged starter | `pnpm template:build` |
| Test staged starter | `pnpm template:test` |
| Starter coverage | `pnpm template:test:coverage` |
| Publish template branch + tag | `pnpm template:publish --version <semver>` |

### Notes on template sync

- `templates/saas-boilerplate` is the managed starter source.
- `.generated/saas-boilerplate` is the clean staged copy used for template validation and root build tracing.
- `pnpm build` stages the starter first because `/api/scaffold` packages the clean staged copy.
- `pnpm template:check-sync` fails if generated artifacts such as `node_modules`, `.next`, `.turbo`, `coverage`, `dist`, or `build` are present inside the managed template tree.

### Push a new boilerplate version to GitHub

When you want to release a new starter version such as `1.0.1`, use this flow:

1. Bump the versions across the workspace and restage the managed template:

```bash
pnpm version:bump 1.0.1
```

2. Verify the template is synced cleanly before pushing:

```bash
pnpm template:check-sync
```

If you changed template-managed files manually and did not use `pnpm version:bump`, run:

```bash
pnpm template:stage
pnpm template:check-sync
```

3. Review the changed files:

```bash
git status
git diff
```

4. Commit the version bump on `main` and push it:

```bash
git add package.json template-sync.manifest.json template-overrides/saas-boilerplate/package.json templates/saas-boilerplate .generated/saas-boilerplate scripts/bump-version.mjs README.md
git commit -m "chore: release boilerplate v1.0.1"
git push origin main
```

5. Publish the template branch and tag:

```bash
pnpm template:publish --version 1.0.1
```

This publishes:

- Branch: `template/saas-boilerplate`
- Tag: `template/v1.0.1`
- Version file inside the starter: `.boilerplate-version`

Use this to preview the version bump without editing files:

```bash
pnpm version:bump --dry-run 1.0.1
```

Use this to publish the template branch locally without pushing:

```bash
pnpm template:publish --version 1.0.1 --no-push
```

## 🤝 Contributing and Docs

- [Contributing guide](docs/CONTRIBUTING.md)
- [Security policy](docs/SECURITY.md)
- [Changelog](docs/CHANGELOG.md)

If you change shared SaaS behavior, make the change in the root repo first and then propagate it with `pnpm template:sync`.

## 💬 Support

- Email: [support@saasforge.dev](mailto:support@saasforge.dev)
- Issues: [GitHub Issues](https://github.com/anoopkarnik/saas-forge/issues)
- Discussions: [GitHub Discussions](https://github.com/anoopkarnik/saas-forge/discussions)
- Repository: [github.com/anoopkarnik/saas-forge](https://github.com/anoopkarnik/saas-forge)

## 📝 License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.
