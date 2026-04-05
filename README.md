<div align="center">

# SaaS Forge

### Shipped full-stack SaaS starter template

[![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)](https://github.com/anoopkarnik/saas-forge)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node Version](https://img.shields.io/badge/node-%3E%3D20-brightgreen)](https://nodejs.org)
[![pnpm](https://img.shields.io/badge/pnpm-10.4.1-orange.svg)](https://pnpm.io)

[What Ships Today](#-what-ships-today) •
[Quick Start](#-quick-start) •
[Environment](#-environment) •
[Commands](#-commands)

</div>

This repository is the shipped SaaS starter template from SaaS Forge. It includes the web app, desktop app, mobile app, and shared auth/database/UI packages, without the root repo's scaffold download workflow or template management tooling.

If you want the source repo that powers the starter and the template packaging flow, see the main project at [github.com/anoopkarnik/saas-forge](https://github.com/anoopkarnik/saas-forge).

## ✨ What Ships Today

- **Web app**: Next.js 15 app with auth flows, landing pages, Notion-backed documentation, legal pages, admin CMS, user management, uploads, and payment webhooks.
- **Desktop app**: Electron app with auth, documentation viewer, support surfaces, admin user management, and CMS screens.
- **Mobile app**: Expo app with auth, documentation viewer, settings, support flows, and admin screens.
- **Shared platform modules**: Better Auth, tRPC, Prisma/Postgres, Notion CMS utilities, React Email/Resend, shared UI components, Blob/R2 storage, BetterStack logging, Google Analytics, and Upstash rate limiting.

## 🚀 Quick Start

### Run the starter locally

```bash
pnpm install

# Linux only: if Electron fails to start because the binary was skipped
node node_modules/.pnpm/electron@<version>/node_modules/electron/install.js

cp apps/web/.env.example apps/web/.env
pnpm generate
pnpm migrate
pnpm dev
```

If you plan to run the native clients too, review `apps/desktop/.env.example` and `apps/mobile/.env.example` after the web env is set up.

Default local URLs:

| Surface | URL | Notes |
|---|---|---|
| Web | `http://localhost:3000` | Next.js app |
| Desktop renderer | `http://localhost:5173` | Electron renderer dev server |
| Mobile web preview | `http://localhost:8081` | Expo web preview |

## ⚙️ Environment

The canonical config surface is [`apps/web/.env.example`](apps/web/.env.example). Review the native env examples too if you plan to run the desktop or mobile clients.

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
│   ├── web/                  # Next.js app
│   ├── desktop/              # Electron app
│   └── mobile/               # Expo app
├── packages/
│   ├── auth/                 # Better Auth setup and clients
│   ├── cms/                  # Notion CMS utilities
│   ├── database/             # Prisma schema, client, and seed scripts
│   ├── email/                # Resend + React Email integration
│   ├── observability/        # Logging utilities
│   └── ui/                   # Shared UI components, blocks, and helpers
└── docs/                     # Project docs and policies
```

## 🧪 Commands

### Workspace

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
| CMS package tests | `pnpm --filter @workspace/cms test` |

### Database

| Task | Command |
|---|---|
| Generate Prisma client | `pnpm generate` |
| Run local migrations | `pnpm migrate` |
| Seed database | `pnpm seed` |
| Reset database | `pnpm reset` |

## 🤝 Contributing and Docs

- [Contributing guide](docs/CONTRIBUTING.md)
- [Security policy](docs/SECURITY.md)
- [Changelog](docs/CHANGELOG.md)

For starter-specific customization, edit the app and package code directly in this workspace.

## 💬 Support

- Email: [support@saasforge.dev](mailto:support@saasforge.dev)
- Issues: [GitHub Issues](https://github.com/anoopkarnik/saas-forge/issues)
- Discussions: [GitHub Discussions](https://github.com/anoopkarnik/saas-forge/discussions)
- Source repo: [github.com/anoopkarnik/saas-forge](https://github.com/anoopkarnik/saas-forge)

## 📝 License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.
