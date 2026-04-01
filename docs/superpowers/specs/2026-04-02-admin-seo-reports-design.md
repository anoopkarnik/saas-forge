# Admin SEO Reports Page — Design Spec

## Context

The saas-forge admin panel currently has two pages (User Management, CMS). There is no way for admins to view site analytics or assess SEO health without leaving the app. Google Analytics 4 is already integrated for tracking (measurement ID `G-N2M432EVF8`), but the data is only viewable in the GA console. This feature adds an `/admin/seo` page with two tabs: an SEO health audit and a GA4 analytics dashboard.

## Overview

- **Route:** `/admin/seo`
- **Access:** Admin-only (client-side `useAdminGuard()` + new server-side `adminProcedure`)
- **Tabs:** "SEO Audit" (default) | "Analytics"
- **Phasing:** Audit tab first (zero external dependencies), Analytics tab second (requires GA4 service account)

## Architecture

```
┌─ Sidebar ─────────────────┐    ┌─ /admin/seo ────────────────────────┐
│ Application                │    │ ┌─ Tabs ────────────────────────┐   │
│   Download SaaS Boilerplate│    │ │ [SEO Audit] [Analytics]       │   │
│   ...                      │    │ ├────────────────────────────────┤   │
│ Admin                      │    │ │                                │   │
│   User Management          │    │ │  Tab content component         │   │
│   CMS                      │    │ │  (SeoAuditTabContent or        │   │
│   SEO Reports  ← NEW      │    │ │   SeoAnalyticsTabContent)      │   │
└────────────────────────────┘    │ └────────────────────────────────┘   │
                                  └──────────────────────────────────────┘

Data flow:
  Page component → useTRPC → seoRouter → server-side logic
                                           ├─ seoAudit.ts (crawl + parse)
                                           └─ googleAnalytics.ts (GA4 Data API)
```

## Phase 1: SEO Audit Tab

### Server-side audit logic (`apps/web/lib/functions/seoAudit.ts`)

Crawls the site's own pages using Node `fetch` + `node-html-parser`. Returns a scored report.

**Pages to check:** Landing page (`/`), plus key routes: `/landing`, `/landing/doc`, `/sign-in`, `/sign-up`. Configurable via a hardcoded list initially.

**Checks performed:**

| Category | Check | Pass Criteria |
|----------|-------|---------------|
| Meta Tags | `<title>` present | Non-empty title tag exists |
| Meta Tags | `<meta name="description">` present | Non-empty description exists |
| Open Graph | `og:title` present | Meta property exists |
| Open Graph | `og:description` present | Meta property exists |
| Open Graph | `og:image` present | Meta property exists with valid URL |
| Technical | `robots.txt` accessible | GET `/robots.txt` returns 200 |
| Technical | `sitemap.xml` accessible | GET `/sitemap.xml` returns 200 |
| Technical | Canonical URL present | `<link rel="canonical">` exists per page |
| Headings | Single H1 per page | Exactly one `<h1>` tag |
| Headings | No skipped heading levels | H1→H2→H3 (no H1→H3 jump) |
| PageSpeed | Performance score | Google PageSpeed API score >= 90 (pass), 50-89 (warning), <50 (fail) |

**PageSpeed degrades gracefully:** If `GOOGLE_PAGESPEED_API_KEY` is not set, the PageSpeed check returns a "warning" status with message "API key not configured."

**Scoring:** `(passes / total_checks) * 100`, displayed as a percentage.

### UI component (`packages/ui/src/blocks/admin/SeoAuditTabContent.tsx`)

- "Run Audit" button (refetch on demand)
- Overall score display (large number with color: green >= 80, yellow >= 50, red < 50)
- Grouped checklist by category with pass/fail/warning icons
- Each check shows: status icon, check name, message, expandable details

### tRPC procedure

```typescript
seo.runSeoAudit: adminProcedure
  .input(z.object({ baseUrl: z.string().url().optional() }))
  .query(async ({ input }) => { ... })
```

## Phase 2: Analytics Tab (GA4 Data API)

### Server-side GA4 logic (`apps/web/lib/functions/googleAnalytics.ts`)

Uses `@google-analytics/data` (`BetaAnalyticsDataClient`) with service account credentials.

**Three data fetchers:**

1. `getTrafficOverview(propertyId, startDate, endDate)` — metrics: sessions, screenPageViews, bounceRate, newUsers
2. `getTopPages(propertyId, startDate, endDate, limit=10)` — dimension: pagePath, metric: screenPageViews
3. `getTrafficSources(propertyId, startDate, endDate)` — dimension: sessionDefaultChannelGroup, metric: sessions

All return structured data matching TypeScript types defined in `apps/web/lib/ts-types/seo.ts`.

### UI component (`packages/ui/src/blocks/admin/SeoAnalyticsTabContent.tsx`)

Layout:
1. **Date range picker** — two date inputs, default last 30 days
2. **4 stat cards** (2x2 grid) — Sessions, Page Views, Bounce Rate, New Users
3. **Top Pages table** — rank, path, view count (shadcn Table)
4. **Traffic Sources chart** — recharts PieChart with legend

When GA4 env vars are not configured, shows a setup-required message with instructions.

### tRPC procedures

```typescript
seo.getTrafficOverview: adminProcedure.input(dateRangeSchema).query(...)
seo.getTopPages: adminProcedure.input(dateRangeSchema).query(...)
seo.getTrafficSources: adminProcedure.input(dateRangeSchema).query(...)
```

## Server-side Admin Enforcement (`adminProcedure`)

**Gap identified:** The codebase has `baseProcedure` and `protectedProcedure` but no admin-level procedure. Admin pages rely solely on client-side `useAdminGuard()`. Any authenticated user could call admin tRPC endpoints directly.

**Fix:** Add `adminProcedure` to `apps/web/trpc/init.ts`:

```typescript
export const adminProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  if (ctx.session.user.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required." });
  }
  return next({ ctx });
});
```

## New Environment Variables

| Variable | Required | Purpose |
|----------|----------|---------|
| `GOOGLE_ANALYTICS_PROPERTY_ID` | For Analytics tab | GA4 numeric property ID |
| `GOOGLE_ANALYTICS_SERVICE_ACCOUNT_KEY` | For Analytics tab | Service account JSON key (stringified) |
| `GOOGLE_PAGESPEED_API_KEY` | Optional | PageSpeed Insights API key |

All added to `apps/web/.env.example` with comments.

## Google Cloud Service Account Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create or select a project
3. Enable **Google Analytics Data API** (APIs & Services > Enable APIs)
4. Create a **Service Account** (IAM & Admin > Service Accounts)
5. Generate and download a **JSON key** for the service account
6. In **Google Analytics 4** admin: Property Access Management > add the service account email as "Viewer"
7. Set `GOOGLE_ANALYTICS_PROPERTY_ID` to your GA4 property's numeric ID (Admin > Property Settings)
8. Set `GOOGLE_ANALYTICS_SERVICE_ACCOUNT_KEY` to the JSON key content (stringified)
9. (Optional) Enable **PageSpeed Insights API**, create an API key, set `GOOGLE_PAGESPEED_API_KEY`

## New Dependencies

| Package | Install Location | Purpose |
|---------|-----------------|---------|
| `node-html-parser` | `apps/web` | Lightweight HTML parsing for SEO audit |
| `@google-analytics/data` | `apps/web` | GA4 Data API client (Phase 2) |
| `recharts` | `packages/ui` | Chart rendering (Phase 2) |

## File Manifest

### New Files

| File | Description |
|------|-------------|
| `apps/web/app/(home)/admin/seo/page.tsx` | Admin SEO page with two tabs |
| `apps/web/trpc/routers/seoProcedures.ts` | tRPC router for SEO endpoints |
| `apps/web/lib/ts-types/seo.ts` | TypeScript type definitions |
| `apps/web/lib/zod/seo.ts` | Zod input validation schemas |
| `apps/web/lib/functions/seoAudit.ts` | Server-side SEO audit logic |
| `apps/web/lib/functions/googleAnalytics.ts` | GA4 Data API wrapper (Phase 2) |
| `packages/ui/src/blocks/admin/SeoAuditTabContent.tsx` | Audit results UI |
| `packages/ui/src/blocks/admin/SeoAnalyticsTabContent.tsx` | Analytics dashboard UI (Phase 2) |
| `apps/web/blocks/admin/SeoAuditTabContent.tsx` | Re-export barrel |
| `apps/web/blocks/admin/SeoAnalyticsTabContent.tsx` | Re-export barrel (Phase 2) |

### Modified Files

| File | Change |
|------|--------|
| `apps/web/trpc/init.ts` | Add `adminProcedure` |
| `apps/web/trpc/routers/_app.ts` | Register `seoRouter` |
| `apps/web/components/home/AppSidebar.tsx` | Add "SEO Reports" sidebar item |
| `apps/web/.env.example` | Add 3 new env vars |
| `apps/web/package.json` | Add `node-html-parser`, `@google-analytics/data` |
| `packages/ui/package.json` | Add `recharts` |

## Verification

1. **Build check:** `pnpm build` passes with no errors
2. **Sidebar:** Admin users see "SEO Reports" in sidebar, non-admins do not
3. **Route guard:** Visiting `/admin/seo` as non-admin redirects to `/`
4. **SEO Audit tab:** Click "Run Audit" → shows scored checklist with real results
5. **Analytics tab (without credentials):** Shows "setup required" message
6. **Analytics tab (with credentials):** Shows traffic overview, top pages table, sources chart
7. **tRPC protection:** Calling `seo.runSeoAudit` as non-admin returns FORBIDDEN error
8. **Lint/type check:** `pnpm lint` and `pnpm --filter web typecheck` pass
