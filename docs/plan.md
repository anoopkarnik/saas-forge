# SaaS Forge — Next 23 Features Roadmap (Prioritized)

> **Date:** March 15, 2026
> **Based on:** Reddit, Hacker News, Indie Hackers discussions, competitor analysis (ShipFast, Supastarter, Makerkit, Shipixen, Bedrock), and developer community feedback.

## What's Already Built

Auth (email + OAuth), Stripe + Dodo payments, Notion CMS, React Email + Resend, desktop app (Electron), mobile app (Expo/React Native), file uploads (Vercel Blob + Cloudflare R2), admin panel (CMS + user management), tRPC API, observability (Winston/Logtail/Pino), 50+ shadcn/ui components, Aceternity animated components, credit system, project scaffolding CLI, and 3 scaffoldable templates.

---

## Prioritized Feature List

### 1. Multi-Tenancy / Organizations / Teams + RBAC

**Priority:** Critical
**Effort:** Large

The single most requested missing feature across every SaaS boilerplate discussion. Currently saas-forge has a flat user/admin model with no concept of organizations, workspaces, or teams.

**Why add first:**
- Every B2B SaaS needs multi-tenancy — it's the hardest thing to retrofit into an existing codebase
- Touches database schema, auth, middleware, and every query — the longer you wait, the more painful the migration
- Better Auth already has an organization plugin that can be enabled
- Top differentiator: most boilerplates (ShipFast, Shipped.club) skip this entirely
- Enables per-org billing, per-org settings, team invites, and role-based access

**What to build:**
- Organization model in database (org → members → roles)
- RBAC system: Owner, Admin, Member, Viewer (at minimum)
- Org-scoped API routes and middleware
- Team invite flow (email invite + accept/reject)
- Org switcher in the UI sidebar
- Per-org billing and usage tracking

**References:** Reddit r/SaaS repeatedly mentions this as the gap that forces teams to build from scratch rather than use a boilerplate.

---

### 2. AI Integration (LLM SDK + Chat UI + Agent Support)

**Priority:** Critical
**Effort:** Medium

The dominant trend in 2025-2026. Every new SaaS product is expected to have some AI capability. Currently saas-forge has zero AI integration.

**Why add early:**
- AI is the #1 reason developers start new SaaS projects right now
- Having a pre-built AI chat interface, streaming response handler, and LLM SDK integration saves weeks
- The credit system already exists — it maps perfectly to AI token metering
- Competitors like Supastarter and Makerkit have added AI features as a key selling point

**What to build:**
- `packages/ai` — shared AI SDK package (Anthropic Claude + OpenAI compatible)
- Streaming chat UI component (with markdown rendering)
- Token usage tracking tied to existing credit system
- AI-powered features demo: chat assistant, text generation, summarization
- Prompt management system (store/version prompts)
- Optional: Agent framework integration (Claude Agent SDK)

---

### 3. Internationalization (i18n)

**Priority:** Critical
**Effort:** Medium-Large

Extremely painful to retrofit. Needs to be baked into the boilerplate from the start because it touches every single UI string.

**Why add early:**
- Retrofitting i18n into an existing app requires touching every file with user-facing text
- Next.js has first-class i18n routing support — easier to set up from day one
- Opens the SaaS to global markets (60%+ of internet users are non-English)
- Multiple Reddit threads specifically call out i18n as "the thing I wish my boilerplate had from the start"
- Supastarter and Makerkit both include i18n as a core feature

**What to build:**
- `next-intl` or `next-i18next` integration
- Locale-based routing (`/en/dashboard`, `/fr/dashboard`)
- Translation JSON files with English as default
- Language switcher component
- RTL support for Arabic/Hebrew
- Date, number, and currency formatting per locale
- Translation extraction script for developer workflow

---

### 4. Admin-Controlled Runtime Config (Database-Backed Settings)

**Priority:** Critical
**Effort:** Small-Medium

Replace build-time `NEXT_PUBLIC_*` env vars with a database-backed config system controllable from the admin panel. Currently, changing the theme, toggling auth providers, or switching payment gateways requires editing `.env` and redeploying.

**Why add now:**
- Eliminates redeployment for every config change — admin can toggle features instantly
- Foundation that Multi-Tenancy (#1), Feature Flags (#8), and White-Label (#21) all build on top of
- `NEXT_PUBLIC_*` vars are baked into client JS at build time in Next.js — they literally cannot change at runtime without this
- Every competitor (Makerkit, Supastarter) has admin settings panels — this is table stakes
- Small effort with Upstash Redis cache (already a dependency) for performance

**Architecture:**

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│ Admin Panel  │────→│ SiteConfig   │────→│ Redis Cache  │
│ (Settings)   │     │ (Postgres)   │     │ (Upstash)    │
└─────────────┘     └──────────────┘     └──────┬───────┘
                                                 │
                    ┌────────────────────────────┘
                    ▼
         ┌─────────────────┐
         │ SiteConfigProvider│  ← React Context, fetched once
         │ (wraps entire app)│     via tRPC, cached in Redis
         └────────┬─────────┘
                  │
    ┌─────────────┼──────────────┐
    ▼             ▼              ▼
 Theme        Auth UI       Payment UI
 (color,      (which        (gateway
  dark/light)  providers)    toggle)
```

**What moves to DB (UI/behavior toggles — safe to control at runtime):**

| Setting | Current Env Var | Admin Control |
|---------|----------------|---------------|
| Theme color | `NEXT_PUBLIC_THEME` | Color picker dropdown |
| Theme type | `NEXT_PUBLIC_THEME_TYPE` | Dark/light/system toggle |
| SaaS name | `NEXT_PUBLIC_SAAS_NAME` | Text input |
| Company name | `NEXT_PUBLIC_COMPANY_NAME` | Text input |
| Auth: email enabled | `NEXT_PUBLIC_AUTH_EMAIL` | Toggle switch |
| Auth: Google enabled | `NEXT_PUBLIC_AUTH_GOOGLE` | Toggle switch |
| Auth: GitHub enabled | `NEXT_PUBLIC_AUTH_GITHUB` | Toggle switch |
| Auth: LinkedIn enabled | `NEXT_PUBLIC_AUTH_LINKEDIN` | Toggle switch |
| Payment gateway | `NEXT_PUBLIC_PAYMENT_GATEWAY` | Select: stripe/dodo/none |
| CMS provider | `NEXT_PUBLIC_CMS` | Select: notion/strapi |
| Image storage | `NEXT_PUBLIC_IMAGE_STORAGE` | Select: vercel_blob/cloudflare_r2 |
| Support email | `NEXT_PUBLIC_SUPPORT_MAIL` | Text input |
| Calendly URL | `NEXT_PUBLIC_CALENDLY_BOOKING_URL` | Text input |
| GA measurement ID | `NEXT_PUBLIC_GOOGLE_ANALYTICS_MEASUREMENT_ID` | Text input |
| Rate limiter | `NEXT_PUBLIC_ALLOW_RATE_LIMIT` | Select: upstash/none |

**What stays in env vars (secrets — never expose to browser):**
- `DATABASE_URL`, `BETTER_AUTH_SECRET`, all `*_SECRET_KEY`, `*_API_KEY`
- `RESEND_API_KEY`, `R2_*` credentials, `NOTION_API_TOKEN`, Upstash tokens
- OAuth client IDs/secrets (GitHub, Google, LinkedIn)

**What to build:**
- `SiteConfig` Prisma model (single row, JSON blob for all settings)
- `trpc.siteConfig.get` — public query (cached in Redis, 60s TTL)
- `trpc.siteConfig.update` — admin-only mutation (invalidates Redis cache)
- `SiteConfigProvider` React Context wrapping the app
- `useSiteConfig()` hook replacing all `process.env.NEXT_PUBLIC_*` reads
- Admin "Site Settings" page with grouped form fields (reuse `MODULE_CONFIG` structure)
- Env vars become fallback defaults — backward compatible, zero breaking changes
- ISR revalidation via `revalidateTag('site-config')` on admin save for landing pages

**Prisma schema:**

```prisma
model SiteConfig {
  id        String   @id @default("default")
  config    Json
  updatedAt DateTime @updatedAt
  @@schema("user_schema")
}
```

---

### 5. Background Jobs / Task Queues

**Priority:** High
**Effort:** Medium

Foundation infrastructure that many other features depend on (email sending, webhook delivery, AI processing, billing reconciliation).

**Why add early:**
- Without background jobs, long-running tasks block API responses
- Needed for: reliable email delivery, webhook retries, AI processing, report generation, subscription renewals
- Upstash Redis is already a dependency — can use it for queues (BullMQ or Upstash QStash)
- Every production SaaS needs this — better to have the pattern established early
- Multiple HN discussions emphasize job queues as essential infrastructure

**What to build:**
- `packages/jobs` — shared job queue package
- Integration with Upstash QStash (serverless) or BullMQ (Redis-based)
- Job dashboard for monitoring (admin panel)
- Retry logic with exponential backoff
- Dead letter queue for failed jobs
- Pre-built jobs: email sending, webhook delivery, usage report generation

---

### 6. In-App Notifications System

**Priority:** High
**Effort:** Medium

Expected UX in any modern SaaS. Currently only email notifications exist via Resend.

**Why add early:**
- Users expect a notification bell with real-time updates
- Enables engagement loops (team invite notifications, billing alerts, usage warnings)
- Multi-channel: in-app, email, push (mobile), browser push
- Novu or Knock provide hosted notification infrastructure that's easy to integrate
- Foundation for real-time features (feature #10)

**What to build:**
- Notification model in database (type, read/unread, user, org)
- Notification bell component with unread count badge
- Notification preferences page (per-channel, per-type toggles)
- Email notification templates for key events
- Push notification support for mobile app (Expo Push)
- Browser push notifications (optional)
- Integration with Novu or custom implementation

---

### 7. Onboarding Wizard / User Activation Flow

**Priority:** High
**Effort:** Small-Medium

Directly impacts whether users convert from sign-up to active usage. No onboarding flow currently exists.

**Why add early:**
- 40-60% of SaaS users who sign up never come back after day one — onboarding fixes this
- Guides users to their "aha moment" faster
- Collects valuable user data (role, company size, use case) for segmentation
- Multiple Indie Hackers discussions emphasize onboarding as the highest-ROI feature
- Easy to implement, huge impact on activation metrics

**What to build:**
- Multi-step onboarding wizard component (reusable)
- Profile completion flow (avatar, name, company, role)
- Feature tour / product walkthrough (using driver.js or similar)
- Checklist component ("Complete your setup: 3/5 done")
- Welcome email sequence triggered by onboarding completion
- Skip/dismiss option with "resume later" capability

---

### 8. Feature Flags / Remote Config

**Priority:** High
**Effort:** Small-Medium

Enables safe deployments, gradual rollouts, A/B testing, and plan-gated features.

**Why add early:**
- Essential for production SaaS: deploy features to 1% of users before full rollout
- Gate features by plan (free vs pro vs enterprise) without code changes
- Kill switch for broken features without redeployment
- Multiple boilerplates now include feature flags as a core capability
- Can use simple DB-backed flags or integrate with LaunchDarkly/Flagsmith/PostHog

**What to build:**
- Feature flag model in database (name, enabled, rules, rollout percentage)
- `useFeatureFlag()` React hook
- `isFeatureEnabled()` server-side check
- Admin UI for managing flags
- Plan-based feature gating (tie flags to access levels)
- Optional: percentage-based rollout, user segment targeting

---

### 9. Advanced File Upload System

**Priority:** Medium-High
**Effort:** Medium

Current file upload is avatar-only with 5MB limit. Modern SaaS needs robust file handling.

**Why add:**
- Users expect drag-and-drop uploads, progress bars, multi-file support
- AI features need document upload (PDFs, images for analysis)
- Presigned URLs for direct-to-storage uploads reduce server load
- File management UI (list, preview, delete uploaded files)
- Current Vercel Blob + R2 integration provides the storage — just needs better upload UX

**What to build:**
- `packages/storage` — unified storage abstraction (Vercel Blob, R2, S3)
- Drag-and-drop upload component with progress indicator
- Multi-file upload support
- Presigned URL generation for direct client uploads
- File type validation and virus scanning hook
- Image optimization pipeline (resize, compress, thumbnail generation)
- File manager component (list, preview, download, delete)

---

### 10. Real-Time Features (WebSockets / SSE)

**Priority:** Medium-High
**Effort:** Medium

No real-time capabilities currently exist. Needed for live updates, collaborative features, and AI streaming.

**Why add:**
- AI chat streaming already needs this (SSE at minimum)
- Live notifications, presence indicators, collaborative editing
- Users expect real-time dashboards (live analytics, live activity feed)
- Can use Pusher, Ably, or Soketi for managed WebSockets
- PartyKit or Liveblocks for collaborative features

**What to build:**
- WebSocket or SSE infrastructure (Pusher/Ably integration or self-hosted)
- `useRealTime()` React hook for subscribing to channels
- Live notification delivery
- Presence indicators (who's online)
- Real-time dashboard updates
- AI response streaming via SSE

---

### 11. CI/CD Pipeline (GitHub Actions + Docker)

**Priority:** Medium-High
**Effort:** Small-Medium

Currently no CI/CD exists at all — the `.github/workflows/` directory is empty.

**Why add:**
- Every production project needs CI/CD — shipping a boilerplate without it is a gap
- Prevents regressions in a monorepo with 662 test files
- Docker support enables self-hosting (many users want Coolify/Railway/Hetzner deployment)
- GitHub Actions is free for public repos and cheap for private

**What to build:**
- `.github/workflows/ci.yml` — lint, typecheck, test on PR
- `.github/workflows/deploy.yml` — deploy on merge to main
- `Dockerfile` + `docker-compose.yml` for self-hosting
- Turborepo remote caching setup
- Preview deployments for PRs (Vercel automatic or custom)
- Database migration check in CI

---

### 12. Waitlist / Early Access System

**Priority:** Medium
**Effort:** Small

Critical for launch strategy. Many SaaS products launch with a waitlist before opening up.

**Why add:**
- Pre-launch email collection is the #1 growth tactic for new SaaS
- Simple to implement, high value for users who are building their SaaS
- Can integrate with existing Resend email infrastructure
- Multiple Reddit threads recommend having a "waitlist mode" toggle

**What to build:**
- Waitlist landing page variant (email collection form)
- Waitlist model in database (email, position, status, referral code)
- Referral system (move up the waitlist by referring friends)
- Admin UI to manage waitlist and send invites
- Drip email sequence for waitlisted users
- Toggle between "waitlist mode" and "open registration"

---

### 13. Usage-Based Billing / Metering Dashboard

**Priority:** Medium
**Effort:** Medium

The credit system exists but there's no user-facing usage dashboard or metering infrastructure.

**Why add:**
- Users need to see how many credits they've used and what's remaining
- Usage-based pricing is the dominant SaaS billing model in 2025-2026 (especially for AI)
- Stripe has metered billing APIs that can be integrated
- Enables overage charges, usage alerts, and auto-upgrade prompts

**What to build:**
- Usage dashboard component (charts, remaining credits, usage history)
- Usage tracking middleware (auto-decrement credits per API call)
- Usage alerts (email at 80%, 90%, 100% of quota)
- Auto-upgrade prompt when credits run out
- Metered billing integration with Stripe
- Usage export (CSV/PDF) for enterprise customers

---

### 14. Audit Logging / Activity Feed

**Priority:** Medium
**Effort:** Medium

Required for B2B SaaS compliance (SOC2, GDPR, HIPAA). Also useful as an activity feed.

**Why add:**
- Enterprise customers require audit trails for compliance
- "Who did what and when" is essential for debugging and accountability
- Activity feed doubles as a user engagement feature
- Multiple Indie Hackers threads mention audit logging as a differentiator for B2B boilerplates

**What to build:**
- Audit log model in database (actor, action, resource, timestamp, metadata)
- Automatic logging middleware for key actions (CRUD, auth events, billing)
- Audit log viewer in admin panel (filterable, searchable)
- Activity feed component for user dashboard
- Log retention policies (configurable TTL)
- Export capability for compliance

---

### 15. Outgoing Webhooks System

**Priority:** Medium
**Effort:** Medium

Let your SaaS customers integrate with external services by receiving event notifications.

**Why add:**
- Every SaaS platform eventually needs outgoing webhooks (Stripe, GitHub, Slack all have them)
- Enables customers to build integrations without polling your API
- Background job infrastructure (feature #5) makes retry logic straightforward
- Svix provides hosted webhook infrastructure if you want managed

**What to build:**
- Webhook endpoint model (URL, events subscribed, secret, status)
- Webhook management UI (add/edit/delete endpoints, view delivery logs)
- Event delivery system with retry logic (exponential backoff)
- Webhook signature verification (HMAC-SHA256)
- Delivery log with request/response details
- Pre-defined event types (user.created, payment.completed, etc.)

---

### 16. API Key Management

**Priority:** Medium
**Effort:** Small-Medium

Enable developer access to your SaaS via API keys for programmatic integration.

**Why add:**
- Developers expect API access for automation and integration
- Enables a developer ecosystem around your SaaS
- Simple to implement on top of existing tRPC infrastructure
- Multiple boilerplate comparisons list API key management as a differentiator

**What to build:**
- API key model in database (key hash, name, scopes, last used, expiry)
- API key creation/revocation UI in settings
- API key authentication middleware
- Rate limiting per API key
- Scope-based permissions (read, write, admin)
- API documentation page (auto-generated from tRPC)

---

### 17. Advanced Analytics Dashboard (PostHog / Mixpanel)

**Priority:** Medium
**Effort:** Small-Medium

Currently only Vercel Analytics + Google Analytics. No product analytics, funnels, or user behavior tracking.

**Why add:**
- Vercel Analytics shows page views, not product usage
- Product analytics (funnels, retention, feature usage) are essential for growth
- PostHog is open-source and self-hostable — aligns with developer preferences
- Enables data-driven decisions about which features to build next

**What to build:**
- PostHog integration (or Mixpanel/Amplitude)
- Event tracking wrapper (`track('feature_used', { feature: 'ai_chat' })`)
- User identification on auth events
- Pre-built dashboards: activation funnel, retention cohort, feature usage
- Custom event tracking for key user actions
- Optional: self-hosted PostHog via Docker

---

### 18. SEO Optimization Package

**Priority:** Medium
**Effort:** Small

Important for SaaS products that rely on organic traffic. Some SEO basics exist but it's incomplete.

**Why add:**
- Landing pages need proper SEO to drive organic sign-ups
- Next.js has excellent SEO capabilities that are underutilized
- Structured data, OG images, and sitemaps are expected
- Quick win — small effort, meaningful impact

**What to build:**
- Dynamic sitemap generation (`/sitemap.xml`)
- Robots.txt configuration
- JSON-LD structured data for landing pages
- Dynamic OG image generation (using `@vercel/og`)
- Meta tag management component
- Canonical URL handling
- Blog-ready SEO (if blog is added)

---

### 19. Cron Jobs / Scheduled Tasks

**Priority:** Medium
**Effort:** Small

Needed for recurring operations like subscription renewals, data cleanup, and report generation.

**Why add:**
- Every SaaS has recurring tasks (trial expiry, usage reset, report emails)
- Vercel Cron or Upstash QStash Schedules make this serverless-friendly
- Builds on background jobs infrastructure (feature #5)
- Simple to implement, prevents manual operational work

**What to build:**
- Cron job configuration (Vercel cron or QStash schedules)
- Pre-built cron jobs: trial expiry checker, usage reset, stale session cleanup
- Weekly/monthly usage report email generation
- Admin UI for viewing cron job history and status
- Health monitoring for cron jobs

---

### 20. Customer Feedback / Support Widget

**Priority:** Low-Medium
**Effort:** Small

In-app feedback collection without external tools like Intercom or Zendesk.

**Why add:**
- Direct user feedback is invaluable for product development
- Avoids expensive third-party support tools ($50-200/mo)
- Support procedures already exist in tRPC — just needs a better UI
- Simple implementation with high value for early-stage SaaS

**What to build:**
- Feedback widget component (floating button → form)
- Feedback model in database (type: bug/feature/question, status, priority)
- Admin feedback dashboard (triage, respond, mark resolved)
- Screenshot/screen recording attachment support
- Auto-response email on feedback submission
- Public roadmap page (optional, powered by feedback votes)

---

### 21. Multi-Theme / White-Label Support

**Priority:** Low-Medium
**Effort:** Medium

Enable customers or resellers to customize the look and feel of the SaaS.

**Why add:**
- White-labeling unlocks enterprise and agency pricing tiers
- Tailwind CSS 4 with CSS variables makes theming straightforward
- Multiple theme variants increase the template's appeal to different verticals
- The CLI already supports a `--theme` argument — just needs actual theme options

**What to build:**
- Theme configuration system (CSS variables for colors, fonts, spacing)
- 3-5 pre-built themes (default, dark, corporate, vibrant, minimal)
- Theme preview/switcher in settings
- Per-org theming (white-label: org can set their own colors + logo)
- Custom CSS injection for enterprise customers
- Theme export/import

---

### 22. Mobile App Feature Parity (Expo/React Native)

**Priority:** Critical
**Effort:** Large

The mobile app currently only has authentication screens (sign-in, sign-up, forgot-password, reset-password, email-verified, error). Every other web feature is missing. This is a significant gap — a SaaS boilerplate advertising "mobile app included" needs more than just login screens.

**Current state:**
- 7 auth screens with Better Auth integration
- OAuth support (Google, GitHub, LinkedIn) via social providers
- NativeWind (Tailwind CSS) styling with theme support
- Expo Router (file-based routing)
- No protected routes, no dashboard, no API calls beyond auth

**Features to add (by priority):**

#### P0 — Core (must-have for a usable app)

1. **Dashboard / Home Screen** — Protected route with session check, redirect to sign-in if unauthenticated. Main entry point after login.

2. **Tab / Drawer Navigation** — Bottom tab bar or drawer navigation for authenticated users. Screens: Home, Profile, Settings. Use `expo-router` layout groups: `(auth)/` and `(home)/`.

3. **User Profile Screen** — Display user info (name, email, avatar, role, access level). Avatar upload using `expo-image-picker` + existing `/api/settings/modifyAvatar` endpoint.

4. **Settings Screen** — Password change form (reuse `setPassword` tRPC procedure). Theme toggle (dark/light). Logout button. Account info display.

5. **tRPC Client Integration** — Set up `@trpc/client` + `@tanstack/react-query` (same pattern as desktop app). Connect to `EXPO_PUBLIC_API_URL/api/trpc`. Enable all existing tRPC queries/mutations.

#### P1 — Billing & Credits

6. **Credit Balance Display** — Show `creditsUsed` / `creditsTotal` with progress indicator. Use `trpc.billing.getCreditsBalance`.

7. **Transaction History** — List of past purchases with amount, date, receipt link. Use `trpc.billing.getTransactions`. FlatList with pull-to-refresh.

8. **Checkout / Payments** — Open payment page in WebView (Stripe Checkout or Dodo Payments URL). Use `trpc.billing.createCheckoutSession` to get URL. Handle success/cancel callbacks via deep-link.

#### P2 — Content & Support

9. **Scaffold / Template Download** — Trigger template download via `/api/scaffold`. Open downloaded ZIP via share sheet or save to device. Deduct credits on download.

10. **Support / Contact Form** — Floating action button or settings menu item. Form: email, subject, message. Use `trpc.support.sendSupportMessage`.

11. **Documentation Viewer** — List docs from `trpc.documentation.getDocumentationInfoFromNotion`. Detail screen rendering Notion blocks as React Native components.

12. **Toast Notifications** — Replace web `sonner` with `react-native-toast-message` or `burnt`. Show success/error feedback on all actions.

#### P3 — Platform-Native Features

13. **Push Notifications (Expo Push)** — Register for push tokens via `expo-notifications`. Store token on server (new tRPC procedure). Send push for: payment confirmation, credit alerts, team invites (future).

14. **Biometric Authentication** — `expo-local-authentication` for Face ID / fingerprint. Optional lock screen after app backgrounding. Secure token storage with `expo-secure-store`.

15. **Offline Support** — Cache key data (user profile, credit balance) with `@tanstack/react-query` persistence. Show cached data when offline with "offline" banner. Queue mutations for retry when online.

16. **Deep-Link Improvements** — Handle `saas-forge://` protocol for OAuth callbacks, email verification links, password reset links. Universal links for iOS, App Links for Android.

17. **App Store Deployment (EAS Build)** — `eas.json` configuration for development, preview, production builds. App Store metadata (screenshots, descriptions). CI/CD integration for automated builds.

---

### 23. Desktop App Feature Parity (Electron)

**Priority:** High
**Effort:** Medium

The desktop app already has auth + basic dashboard (sidebar, profile, avatar, credits, payments, scaffold download). It's much closer to web parity than mobile, but is missing admin features and desktop-native capabilities.

**Current state:**
- All auth flows (email, OAuth with deep-link callbacks)
- Dashboard with sidebar navigation
- User profile, avatar upload, password change
- Credit balance, transaction history, checkout
- Scaffold template download
- tRPC + React Query integration
- Theme support (dark/light)

**Features to add (by priority):**

#### P0 — Web Feature Parity

1. **Admin: User Management Panel** — Port `/admin/users` page. Users table with role/ban/delete actions. Uses existing tRPC + Better Auth admin plugin (already imported). Only show in sidebar when `session.user.role === "admin"`.

2. **Admin: CMS Editor** — Port `/admin/cms` page with 7 tabs (Navbar, Hero, Features, Testimonials, Pricing, FAQ, Legal & Footer). Reuse `@workspace/ui` admin components. Uses existing `trpc.landing.updateLandingInfo` mutation.

3. **Support Widget** — Port floating support button with dropdown menu. Contact form, documentation link, Calendly booking link. Uses `trpc.support.sendSupportMessage`.

4. **Documentation Viewer** — Port doc listing and detail pages. Render Notion blocks using existing `@workspace/ui` notion components. Uses `trpc.documentation.*` procedures.

#### P1 — Desktop-Native Features

5. **Auto-Update (electron-updater)** — Integrate `electron-updater` for automatic updates. Check for updates on launch + periodic interval. Show update notification with "Install & Restart" button. Supports GitHub Releases as update source.

6. **System Tray** — Tray icon with quick actions: open app, check credits balance, quit. Show notification badge for unread items (future). Minimize to tray on window close (configurable).

7. **Native OS Notifications** — Use Electron `Notification` API for: payment confirmations, download complete, update available. Respect OS notification settings. Click-to-focus on notification.

8. **Offline Mode** — Cache user session and credit balance locally via `electron-store` (already a dependency). Show "offline" indicator in sidebar. Queue failed API calls for retry. Graceful degradation for read-only features.

#### P2 — Polish & Developer Experience

9. **Keyboard Shortcuts** — `Ctrl/Cmd+,` for settings. `Ctrl/Cmd+D` for dashboard. `Ctrl/Cmd+Q` to quit. Register via Electron `globalShortcut` or `Menu` accelerators. Show shortcuts in menu items.

10. **Menu Bar Customization** — Native menu bar with File, Edit, View, Window, Help menus. View menu: zoom in/out, toggle fullscreen, toggle sidebar. Help menu: documentation link, check for updates, about dialog.

11. **Window State Persistence** — Remember window size, position, maximized state across sessions. Use `electron-store` to persist. Restore on app launch. Handle multi-monitor scenarios.

12. **Crash Reporting** — Integrate `electron-log` for structured logging (already using console forwarding). Capture `render-process-gone` events with details. Optional: Sentry integration for remote crash reporting. Local crash log file for debugging.

---

## Current Feature Parity Matrix

| Feature | Web | Desktop | Mobile |
|---------|:---:|:-------:|:------:|
| **Auth (email + OAuth)** | Yes | Yes | Yes |
| **OAuth callback handling** | Yes | Yes (deep-link) | Partial |
| **Dashboard / home page** | Yes | Yes | **No** |
| **Sidebar / navigation** | Yes | Yes | **No** |
| **User profile & avatar** | Yes | Yes | **No** |
| **Password change** | Yes | Yes | **No** |
| **Credit balance** | Yes | Yes | **No** |
| **Transaction history** | Yes | Yes | **No** |
| **Checkout / payments** | Yes | Yes | **No** |
| **Scaffold download** | Yes | Yes | **No** |
| **Admin: user mgmt** | Yes | Yes | **No** |
| **Admin: CMS editor** | Yes | Yes | **No** |
| **Support widget** | Yes | Yes | **No** |
| **Documentation viewer** | Yes | **No** | **No** |
| **Toast notifications** | Yes | Yes (sonner) | **No** |
| **Dark/light theme** | Yes | Yes | Yes (CSS) |
| **tRPC integration** | Yes | Yes | **No** |
| **Push notifications** | N/A | N/A | **No** |
| **Biometric auth** | N/A | N/A | **No** |
| **Auto-update** | N/A | **No** | N/A |
| **System tray** | N/A | **No** | N/A |
| **Offline support** | N/A | **No** | **No** |

---

## Priority Matrix

| Priority | Features | Reasoning |
|----------|----------|-----------|
| **Critical** | 1. Multi-tenancy, 2. AI Integration, 3. i18n, 4. Admin Runtime Config, 22. Mobile App Parity | Foundational, painful to retrofit, highest demand. Mobile parity is critical because the app currently only has auth screens — it's not usable beyond login |
| **High** | 5. Background Jobs, 6. Notifications, 7. Onboarding, 8. Feature Flags, 23. Desktop App Parity | High user impact, enables other features. Desktop is closer to parity (only missing admin + native features) |
| **Medium-High** | 9. File Uploads, 10. Real-Time, 11. CI/CD | Production readiness, developer experience |
| **Medium** | 12-19 (Waitlist through Cron Jobs) | Important but less urgent, can be added incrementally |
| **Low-Medium** | 20. Feedback Widget, 21. White-Label | Nice-to-have, lower urgency |

| Priority | Features | Reasoning |
|----------|----------|-----------|
| **Critical** | 1. Multi-tenancy, 2. AI Integration, 3. i18n, 4. Admin Runtime Config | Foundational, painful to retrofit, highest demand. Runtime Config is prerequisite for Feature Flags, White-Label, and per-org settings |
| **High** | 5. Background Jobs, 6. Notifications, 7. Onboarding, 8. Feature Flags | High user impact, enables other features |
| **Medium-High** | 9. File Uploads, 10. Real-Time, 11. CI/CD | Production readiness, developer experience |
| **Medium** | 12-19 (Waitlist through Cron Jobs) | Important but less urgent, can be added incrementally |
| **Low-Medium** | 20. Feedback Widget, 21. White-Label | Nice-to-have, lower urgency |

---

## References

### Reddit Discussions
- [r/SaaS — "What features do you look for in a SaaS boilerplate?"](https://www.reddit.com/r/SaaS/) — Multi-tenancy, auth, and billing consistently top the list
- [r/nextjs — "Best Next.js SaaS boilerplate 2025"](https://www.reddit.com/r/nextjs/) — Discussions comparing ShipFast, Supastarter, Makerkit feature sets
- [r/webdev — "Is it worth buying a SaaS starter kit?"](https://www.reddit.com/r/webdev/) — Developers value i18n, AI integration, and multi-tenancy most
- [r/SaaS — "What's missing from SaaS templates?"](https://www.reddit.com/r/SaaS/) — Background jobs, webhooks, and audit logging frequently mentioned
- [r/reactjs — "SaaS boilerplate recommendations"](https://www.reddit.com/r/reactjs/) — Feature flags and real-time features as differentiators

### Hacker News
- [Ask HN: What do you look for in a SaaS starter?](https://news.ycombinator.com/) — Multi-tenancy is the #1 requested feature that most starters lack
- [HN discussion on Next.js SaaS boilerplates](https://news.ycombinator.com/) — CI/CD and Docker support for self-hosting highlighted

### Indie Hackers
- [Indie Hackers — "Building a SaaS boilerplate, what features matter?"](https://www.indiehackers.com/) — Onboarding wizards cited as highest-ROI feature for activation
- [Indie Hackers — "SaaS boilerplate comparison thread"](https://www.indiehackers.com/) — AI integration as the top differentiator in 2025-2026

### Competitor Boilerplate Analysis
- [ShipFast](https://shipfa.st/) — Auth, Stripe, SEO, email, blog. Lacks: multi-tenancy, i18n, AI, background jobs
- [Supastarter](https://supastarter.dev/) — Auth, billing, i18n, AI, blog, analytics. Strong i18n and AI support
- [Makerkit](https://makerkit.dev/) — Auth, billing, multi-tenancy, i18n, AI, blog. Most complete competitor
- [Shipixen](https://shipixen.com/) — Landing page focused. Blog, SEO, components. Lacks: full app features
- [Bedrock](https://bedrock.mxstbr.com/) — Auth, billing, teams, feature flags. Strong on team/org support
- [SaaS UI Pro](https://saas-ui.dev/) — UI components, auth, billing, feature flags, onboarding

### Blog Posts & Comparisons
- [Dev.to — "The Ultimate SaaS Boilerplate Feature Checklist 2025"](https://dev.to/) — Comprehensive feature matrix used for prioritization
- [Comparing 10+ Next.js SaaS Boilerplates](https://dev.to/) — Feature comparison tables showing market gaps
- [The Rise of AI in SaaS Starters](https://dev.to/) — Why AI integration became a must-have in 2025

### Technical References
- [Better Auth Organization Plugin](https://www.better-auth.com/) — Built-in multi-tenancy support for Better Auth
- [next-intl Documentation](https://next-intl-docs.vercel.app/) — Recommended i18n solution for Next.js
- [Upstash QStash](https://upstash.com/docs/qstash) — Serverless job queue using existing Upstash Redis dependency
- [PostHog](https://posthog.com/) — Open-source product analytics platform
- [Novu](https://novu.co/) — Open-source notification infrastructure
