<div align="center">

# 🔥 SaaS Forge

### The Ultimate Production-Ready SaaS Boilerplate

[![Version](https://img.shields.io/badge/version-0.4.0-blue.svg)](https://github.com/anoopkarnik/saas-forge)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](http://makeapullrequest.com)
[![Node Version](https://img.shields.io/badge/node-%3E%3D20-brightgreen)](https://nodejs.org)
[![pnpm](https://img.shields.io/badge/pnpm-10.4.1-orange.svg)](https://pnpm.io)

[Features](#-features) •
[Quick Start](#-quick-start) •
[Documentation](#-documentation) •
[Tech Stack](#-tech-stack) •
[Contributing](#-contributing)

</div>

---

## 📖 Overview

**SaaS Forge** is a production-ready, full-stack SaaS boilerplate built with modern technologies. Launch your SaaS product in days, not months. Built with scalability, performance, and developer experience in mind.

### Why SaaS Forge?

- ⚡ **Lightning Fast Setup** - Get up and running in minutes with automated CLI
- 🏗️ **Production Ready** - Battle-tested architecture used in real products
- 🎨 **Beautiful UI** - Pre-built components with shadcn/ui and Tailwind CSS
- 🔐 **Enterprise Auth** - Complete authentication with social logins and email verification
- 💳 **Payment Integration** - Stripe and Dodo Payments with webhooks
- 📱 **Multi-Platform** - Web, Desktop (Electron), and Mobile (Expo/React Native)
- 📱 **Responsive Design** - Mobile-first approach with modern aesthetics
- 🚀 **Optimized Performance** - Redis caching, React Query, and Next.js 15 optimizations
- 🧪 **Type Safe** - End-to-end type safety with TypeScript and tRPC
- 📦 **Monorepo Architecture** - Organized with Turborepo for scalability
- 🎯 **Developer Experience** - Hot reload, ESLint, Prettier, and comprehensive tooling

---

## ✨ Features

<table>
<tr>
<td width="50%">

### 🔑 Authentication & Authorization
- Email/Password authentication
- Social logins (GitHub, Google, LinkedIn)
- Email verification flows
- Password reset functionality
- Session management
- Protected routes middleware
- User impersonation (admin)

### 💰 Payments & Billing
- Stripe integration
- Dodo Payments integration
- Webhook handling
- Subscription management
- Usage-based billing support
- Credit system

</td>
<td width="50%">

### 🎨 UI/UX Components
- 50+ pre-built shadcn/ui components
- Notion-style block renderer
- MDX support for documentation
- Dark mode support
- Animated components (Aceternity)
- Responsive design system
- Loading states & error boundaries

### 🛠️ Developer Tools
- tRPC for type-safe APIs
- React Query for data fetching
- Prisma ORM with PostgreSQL
- Redis caching (Upstash)
- Winston + Logtail logging
- Vitest for testing

</td>
</tr>
</table>

### 📄 Content Management
- **Notion CMS Integration** - Manage content directly from Notion
- Per-section Notion databases (hero, features, testimonials, pricing, FAQ, footer)
- Dynamic landing pages
- Documentation system
- Legal pages (Terms, Privacy, Refund Policy)
- Admin CMS management
- Newsletter & support forms

### 📊 Observability & Monitoring
- Centralized logging with Winston
- Logtail integration for log aggregation
- Google Analytics integration
- Rate limiting via Upstash Redis
- Performance monitoring hooks

### 💾 Storage
- Vercel Blob storage
- Cloudflare R2 storage
- Configurable storage backend

### 🖥️ Multi-Platform Support
- **Web** — Next.js 15 with Turbopack
- **Desktop** — Electron + React 19 + React Router v7
- **Mobile** — Expo + React Native with NativeWind

---

## 🚀 Quick Start

### Using CLI (Recommended)

```bash
npx saas-forge my-saas-app
cd my-saas-app
pnpm install
pnpm dev
```

### Manual Installation

```bash
# Clone the repository
git clone https://github.com/anoopkarnik/saas-forge.git
cd saas-forge

# Install dependencies
pnpm install

# Copy environment variables
cp apps/web/.env.example apps/web/.env

# Generate Prisma client
pnpm run generate

# Run development server
pnpm dev
```

Visit [http://localhost:3000](http://localhost:3000) to see your app! 🎉

---

## 📚 Documentation

### Environment Configuration

Create a [apps/web/.env](apps/web/.env) file with the following variables:

```env
# Project Settings
NEXT_PUBLIC_THEME=
NEXT_PUBLIC_SAAS_NAME=
NEXT_PUBLIC_COMPANY_NAME=
NEXT_PUBLIC_URL=
NEXT_PUBLIC_THEME_TYPE="dark"

# CMS (Notion)
NEXT_PUBLIC_CMS="notion"
NOTION_API_TOKEN=
LANDING_DATABASE_ID=
HERO_DATABASE_ID=
FEATURE_DATABASE_ID=
TESTIMONIAL_DATABASE_ID=
PRICING_DATABASE_ID=
FAQ_DATABASE_ID=
FOOTER_DATABASE_ID=
DOCUMENTATION_DATABASE_ID=

# Authentication (Better Auth)
BETTER_AUTH_SECRET=
NEXT_PUBLIC_AUTH_FRAMEWORK="better-auth"
NEXT_PUBLIC_AUTH_EMAIL=true
NEXT_PUBLIC_AUTH_GOOGLE=false
NEXT_PUBLIC_AUTH_GITHUB=false
NEXT_PUBLIC_AUTH_LINKEDIN=false
AUTH_GITHUB_CLIENT_ID=
AUTH_GITHUB_CLIENT_SECRET=
AUTH_GOOGLE_CLIENT_ID=
AUTH_GOOGLE_CLIENT_SECRET=
AUTH_LINKEDIN_CLIENT_ID=
AUTH_LINKEDIN_CLIENT_SECRET=
RESEND_API_KEY=

# Database & Caching
DATABASE_URL=
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=

# Storage
NEXT_PUBLIC_IMAGE_STORAGE="vercel_blob"
BLOB_READ_WRITE_TOKEN=
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=
NEXT_PUBLIC_R2_PUBLIC_URL=

# Payments (Stripe or Dodo)
NEXT_PUBLIC_PAYMENT_GATEWAY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
DODO_PAYMENTS_API_KEY=
DODO_PAYMENTS_WEBHOOK_KEY=

# Observability
BETTERSTACK_TELEMETRY_SOURCE_TOKEN=
BETTERSTACK_TELEMETRY_INGESTING_HOST=
NEXT_PUBLIC_GOOGLE_ANALYTICS_MEASUREMENT_ID=
NEXT_PUBLIC_ALLOW_RATE_LIMIT="upstash"
```

See [apps/web/.env.example](apps/web/.env.example) for a complete list.

---

## 🏗️ Tech Stack

<table>
<tr>
<td width="50%">

### Frontend
- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript 5.7
- **UI Library**: React 19
- **Styling**: Tailwind CSS 4.x
- **Components**: shadcn/ui
- **Animations**: Framer Motion
- **Forms**: React Hook Form + Zod
- **State**: React Query + tRPC

</td>
<td width="50%">

### Backend
- **API**: tRPC (Type-safe)
- **Database**: PostgreSQL + Prisma
- **Caching**: Redis (Upstash)
- **Auth**: Better Auth
- **Email**: Resend + React Email
- **Payments**: Stripe + Dodo Payments
- **CMS**: Notion API
- **Storage**: Vercel Blob + Cloudflare R2
- **Logging**: Winston + Logtail
- **Analytics**: Google Analytics

</td>
</tr>
</table>

### Desktop & Mobile
- **Desktop**: Electron + electron-vite
- **Mobile**: Expo 55 + React Native + NativeWind

### Tooling & DevOps
- **Monorepo**: Turborepo + pnpm workspaces
- **Testing**: Vitest 4.x
- **Linting**: ESLint 9 + Prettier
- **CI/CD**: GitHub Actions
- **Deployment**: Vercel (recommended)

---

## 📦 Project Structure

```
saas-forge/
├── apps/
│   ├── web/                    # Main Next.js 15 application
│   │   ├── app/                # App router pages
│   │   │   ├── (auth)/        # Authentication pages
│   │   │   ├── (home)/        # Protected home pages
│   │   │   ├── landing/       # Public landing pages
│   │   │   └── api/           # API routes
│   │   ├── blocks/            # Page-level components
│   │   ├── components/        # Feature components
│   │   ├── lib/               # Utility functions
│   │   ├── server/            # Server-side utilities
│   │   └── trpc/              # tRPC configuration
│   ├── desktop/                # Electron + React 19 desktop app
│   └── mobile/                 # Expo + React Native mobile app
│
├── packages/
│   ├── ui/                    # Shared UI components
│   ├── auth/                  # Authentication logic
│   ├── database/              # Prisma schema & client
│   ├── email/                 # Email templates
│   ├── cms/                   # Notion CMS integration
│   ├── observability/         # Logging utilities
│   ├── eslint-config/         # Shared ESLint config
│   └── typescript-config/     # Shared TS config
│
├── scripts/
│   └── cli.js                 # CLI for project scaffolding
│
└── templates/
    ├── saas-boilerplate/           # SaaS starter template
    ├── portfolio-boilerplate/      # Portfolio site template
    └── tech-company-landing-page/  # Landing page template
```

---

## 🎯 Commands

### Development

```bash
# Start all workspaces in dev mode
pnpm dev

# Start only web app
pnpm --filter web dev

# Build all workspaces
pnpm build

# Build only web app
pnpm --filter web build
```

### Code Quality

```bash
# Lint all workspaces
pnpm lint

# Lint with auto-fix
pnpm --filter web lint:fix

# Format code with Prettier
pnpm format

# Type check
pnpm --filter web typecheck
```

### Database

```bash
# Generate Prisma client
pnpm --filter @workspace/database postgres:generate

# Run migrations
pnpm --filter @workspace/database postgres:migrate

# Reset database (⚠️ destroys data)
pnpm --filter @workspace/database postgres:reset
```

### Testing

```bash
# Run all tests
pnpm --filter @workspace/cms test

# Run specific test file
pnpm --filter @workspace/cms test -- testing/index.test.ts
```

---

## 🎨 Adding UI Components

SaaS Forge uses shadcn/ui for components. To add a new component:

```bash
# Add a component (e.g., button)
pnpm dlx shadcn@latest add button -c apps/web

# Import in your code
import { Button } from "@workspace/ui/components/button"
```

Components are automatically placed in [packages/ui/src/components](packages/ui/src/components) and can be used across all apps.

---

## 🔧 Customization

### Theming

Modify theme colors in [apps/web/app/globals.css](apps/web/app/globals.css):

```css
@layer base {
  :root {
    --primary: 222 47% 11%;
    --primary-foreground: 210 40% 98%;
    /* ... more variables */
  }
}
```

### Content Management

All content is managed through Notion databases:

1. **Landing Page**: Configure in Notion database specified by `LANDING_DATABASE_ID`
2. **Documentation**: Configure in Notion database specified by `DOCUMENTATION_DATABASE_ID`
3. **Legal Pages**: Managed through the same landing database with filters

Update content in Notion, and it reflects automatically on your site!

### Authentication Providers

Add/remove providers in [packages/auth/src/better-auth/auth.ts](packages/auth/src/better-auth/auth.ts):

```typescript
socialProviders: {
  github: {
    clientId: process.env.AUTH_GITHUB_ID!,
    clientSecret: process.env.AUTH_GITHUB_SECRET!,
  },
  // Add more providers...
}
```

---

## 🚢 Deployment

### Vercel (Recommended)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/anoopkarnik/saas-forge)

1. Push your code to GitHub
2. Import project in Vercel
3. Add environment variables
4. Deploy!

### Other Platforms

SaaS Forge works with any platform that supports Next.js:

- **Railway**: [Railway.app](https://railway.app)
- **Fly.io**: [Fly.io](https://fly.io)
- **AWS Amplify**: [AWS Amplify](https://aws.amazon.com/amplify/)
- **Digital Ocean**: [App Platform](https://www.digitalocean.com/products/app-platform)

---

## 🤝 Contributing

We love contributions! Please read our [Contributing Guide](CONTRIBUTING.md) before submitting a Pull Request.

### Development Workflow

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes
4. Run tests: `pnpm test`
5. Commit changes: `git commit -m 'Add amazing feature'`
6. Push to branch: `git push origin feature/amazing-feature`
7. Open a Pull Request

### Code Standards

- Write TypeScript with strict mode
- Follow ESLint rules
- Add tests for new features
- Update documentation
- Keep components small and focused
- Use semantic commit messages

---

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

Built with amazing open-source projects:

- [Next.js](https://nextjs.org) - The React Framework
- [shadcn/ui](https://ui.shadcn.com) - Beautiful components
- [Turborepo](https://turbo.build) - Monorepo tooling
- [tRPC](https://trpc.io) - Type-safe APIs
- [Prisma](https://prisma.io) - Next-gen ORM
- [Better Auth](https://better-auth.com) - Authentication solution
- [Notion](https://notion.so) - Content management

---

## 💬 Support & Community

- 📧 **Email**: [support@saasforge.dev](mailto:support@saasforge.dev)
- 🐛 **Issues**: [GitHub Issues](https://github.com/anoopkarnik/saas-forge/issues)
- 💡 **Discussions**: [GitHub Discussions](https://github.com/anoopkarnik/saas-forge/discussions)
- 🐦 **Twitter**: [@anoopkarnik](https://twitter.com/anoopkarnik)

---

## 🗺️ Roadmap

### Completed
- ✅ Core authentication flows
- ✅ Stripe + Dodo payment integration
- ✅ Notion CMS integration
- ✅ Monorepo architecture
- ✅ Desktop app (Electron)
- ✅ Mobile app (Expo/React Native)
- ✅ Multiple scaffold templates (SaaS, Portfolio, Landing Page)
- ✅ Vercel Blob + Cloudflare R2 storage
- ✅ Google Analytics integration
- ✅ Admin CMS management
- ✅ Landing page performance optimizations

### Upcoming Features
- 🔄 Multi-tenancy support
- 🔄 Advanced RBAC (Role-Based Access Control)
- 🔄 Team collaboration features
- 🔄 API key management
- 🔄 Advanced analytics dashboard
- 🔄 Email templates library
- 🔄 GraphQL support
- 🔄 i18n (Internationalization)
- 🔄 A/B testing framework

See our [GitHub Projects](https://github.com/anoopkarnik/saas-forge/projects) for detailed progress.

---

## ⭐ Show Your Support

If you find SaaS Forge helpful, please consider:

- ⭐ Starring the repository
- 🐛 Reporting bugs
- 💡 Suggesting new features
- 📖 Improving documentation
- 🔀 Submitting pull requests

---

<div align="center">

### Built with ❤️ by [Anoop Karnik](https://github.com/anoopkarnik)

**[⬆ back to top](#-saas-forge)**

</div>
