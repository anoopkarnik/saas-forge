# Blog: a CMS-backed blog built for search and AI answer engines

Date: 2026-10-27
Status: draft; awaiting builder check and owner approval

## Why

SaaS Forge has Documentation (admin tab, public `/landing/doc` pages, mobile and
desktop readers) but nothing written to be found: no articles, no dated,
authored content, and only basic SEO plumbing (sitemap, robots, per-page
metadata). The owner wants a Blog that:

1. Brings search and AI-answer traffic to SaaS Forge's own site (posts such as
   billing how-tos, auth comparisons, release write-ups) that link into docs and
   the wizard. Success: posts are indexed quickly, appear in Google results and
   get cited by ChatGPT, Perplexity, Google AI Overviews and similar.
2. Ships to every buyer as a ready-made feature of the starter: the same admin
   editor and public pages, with the SEO / GEO / AIO plumbing already wired, so
   a buyer only has to write posts.

## Decisions made by the owner

- **Blog is core, like Documentation.** Not a scaffold module, no manifest, no
  `scaffold:begin blog` markers, cannot be removed from a download.
- **Authoring works both ways, like Documentation.** MDX files in the repo are
  the source of truth (registered in a constants file, seeded into Postgres), and
  `/admin/blog` creates and edits posts directly in Postgres.
- **Native parity with Documentation.** Mobile gets blog reader screens and a
  blog section in its admin screen; desktop gets blog reader routes (desktop has
  no doc editor today, so it gets no blog editor either).
- **Landing page gets a Blog button** next to the Documentation button.

## Goals

1. `/admin/blog` (web) and the mobile admin "Blog" section create, edit,
   publish/unpublish and delete posts, admin-only on the server.
2. Public `/landing/blog` index and `/landing/blog/[slug]` article pages, plus an
   RSS feed.
3. Each article is fully readable in the server-rendered HTML (title, TL;DR,
   body, byline, dates, JSON-LD), so crawlers that do not run JavaScript (most
   AI crawlers) see it.
4. Site-wide discoverability improvements that also help docs: `llms.txt`,
   explicit AI-crawler rules in robots, real `lastModified` dates in the sitemap.
5. Works under both CMS settings (`NEXT_PUBLIC_CMS=postgres` and `constant`).

## Non-goals

- Comments, likes, newsletter signup, view counters.
- Translating post bodies. Posts are single-language; only the blog's own UI
  strings (button, headings, "min read", empty states) go through i18n (en, es).
- Linking authors to `User` rows. Authors are free text plus an optional avatar
  URL (keeps file-based posts simple).
- A desktop blog editor (desktop has no doc editor).
- Scheduled publishing (a future `publishedAt` is not a timer).
- Writing SaaS Forge's real marketing posts. This change ships the
  infrastructure and sample content; the owner writes posts afterwards.

## Anti-goals (would make this a failure even if it works)

- Article text that only appears after client-side JavaScript runs.
- Drafts leaking anywhere public: index, article route, sitemap, RSS, `llms.txt`,
  markdown endpoint, mobile/desktop readers.
- Making Blog optional or adding scaffold markers for it.
- A blog page shape that diverges from the docs patterns so far that the two
  CMS surfaces need different mental models.

## Constraints

- Follow the Documentation implementation as the template for every layer
  (listed below). Where Documentation has a known weakness that hurts SEO
  (sitemap `lastModified = new Date()`), fix it for both.
- `revalidate` does not take effect on `/landing` pages today: the tRPC server
  proxy reads `headers()`, which makes them dynamic. Redis is the real cache
  (same as docs). Do not rely on ISR for blog pages; reuse the Redis cache
  pattern from `docProcedures.ts` and clear it on every admin write.
- Schema change: add to `packages/database/prisma/cms.prisma`. Do not create the
  migration; the owner runs `pnpm migrate`. The change is additive only.
- Admin writes use `adminProcedure`; admin reads use
  `guestReadableAdminProcedure` (as docs). Editing is Postgres-only, with the
  same `PRECONDITION_FAILED` guard docs use under `constant`.
- Audit actions `blog.created` / `blog.updated` / `blog.deleted` in
  `apps/web/lib/audit/actions.ts`, emit sites inside `audit_log` markers (blog is
  core, but the audit module is not).
- AI fill on the admin editor (`AIFillPromptDialog`) inside `ai` markers, as the
  doc editor does, with a `blog.assistant` agent seeded next to
  `documentation.assistant` in `packages/database/src/seed.ts`.
- Root files with template overrides must be changed in both places:
  `apps/web/trpc/routers/_app.ts`, `apps/web/trpc/apiRegistry.ts`,
  `apps/web/components/home/AppSidebar.tsx` (and their copies under
  `template-overrides/saas-boilerplate/`).
- Paths with a file extension (`/llms.txt`, `/landing/blog/rss.xml`) skip
  `middleware.ts` (matcher), so they are public without a route-policy row.
  Anything under `/landing` is already public via the `/landing` prefix row.
- New UI strings go in `packages/i18n` en and es; keep `pnpm i18n:check` green.

## Data model

New model in `cms.prisma`, related to `LandingPage` like `Documentation`:

| Field | Notes |
|-------|-------|
| `id` | cuid |
| `landingPageId` / `landingPage` | same relation and cascade as `Documentation` |
| `slug` | unique |
| `title` | required |
| `excerpt` | required, 1–2 sentences; meta description fallback and index card text |
| `summary` | optional TL;DR shown first on the article (answer engines quote openings) |
| `content` | MDX/Markdown body |
| `coverImage` | optional URL; Open Graph image |
| `authorName` | required |
| `authorAvatar` | optional URL |
| `tags` | `String[]` |
| `status` | `"draft"` or `"published"` (string, validated by Zod, matching the `type String?` style of `Documentation`) |
| `publishedAt` | set when first published; editable |
| `updatedAt` | `@updatedAt` |
| `seoTitle`, `seoDescription`, `canonicalUrl` | optional overrides |

`LandingPage` gains `blogPosts BlogPost[]`.

## Content source (files)

- MDX bodies in `packages/database/src/blog/`.
- Registry `packages/database/src/constants/blog.ts` exporting `blogPostData`
  (all metadata fields above plus `filePath` and an explicit `updatedAt`, so
  the `constant` CMS has real dates for the sitemap and JSON-LD), exported from
  `constants/index.ts`. *(Builder-check call.)* Constant-mode doc dates stay as
  they are.
- `seed.ts` upserts every registry entry by slug, like documentation.
- Under `NEXT_PUBLIC_CMS=constant`, the site reads the registry and MDX files
  directly (mirror `fetchDocumentationFromLocal` and the constant branch of
  `queryDocumentationBySlug`). Registry entries with `status: "draft"` are hidden
  publicly there too.
- Production refresh: extend `scripts/refresh-cms.ts` (`pnpm cms:refresh`) with a
  blog slug list next to its documentation slug list, so posts written as files
  can be pushed to the production DB with a cache clear, not a re-seed.

## Server layer

Mirror Documentation file-for-file:

- `apps/web/lib/ts-types/blog.ts`
- `apps/web/lib/functions/fetchBlog.ts`, `fetchBlogFromPostgres.ts`,
  `fetchBlogFromLocal.ts` (public list returns published posts only, newest
  `publishedAt` first)
- `apps/web/trpc/routers/blogProcedures.ts`:
  - public: `getBlogIndex`, `getBlogPostBySlug` (metadata + content; 404 for
    drafts and unknown slugs)
  - admin: `listAdminPosts`, `getAdminPostById` (include drafts), `createPost`,
    `updatePost`, `deletePost`
  - Redis cache with its own key, cleared on every write
- Register in `_app.ts` (+ override) and `apiRegistry.ts` (+ override).

## Web UI

- **Admin:** `apps/web/app/(home)/admin/blog/page.tsx`, modelled on
  `admin/doc/page.tsx`: list (with status badge and date), editor for all fields,
  draft/publish toggle, delete. Sidebar entry under Documentation in
  `AppSidebar.tsx` (+ override).
- **Index:** `apps/web/app/landing/blog/page.tsx`: cards (cover, title, excerpt,
  author, date, reading time, tags), tag filter via query string, empty state.
- **Article:** `apps/web/app/landing/blog/[slug]/page.tsx`: title, byline with
  avatar, published and updated dates, reading time, TL;DR box, rendered body
  (same Markdown renderer as `DocPostPage`), tags, prev/next or related posts.
- **Landing:** a Blog button beside Documentation in
  `apps/web/components/landing/HeroSection.tsx`, plus a Blog link in the
  footer (internal links help crawling). `FooterSection.tsx` renders only
  CMS-driven links, so the link is added to the footer data in the landing
  constants, not hard-coded; Postgres sites pick it up on re-seed or via
  `/admin/cms`. *(Builder-check call.)*

## Search, GEO and AIO

Per article:

- `generateMetadata`: title (`seoTitle` || `title`), description
  (`seoDescription` || `excerpt`), canonical (`canonicalUrl` || page URL),
  Open Graph `type: "article"` with `publishedTime`, `modifiedTime`, `authors`,
  `tags`, `images` (cover). Extend `siteMetadata` if it cannot express these.
- JSON-LD `BlogPosting` (headline, description, image, author, datePublished,
  dateModified, mainEntityOfPage, publisher from site config) and
  `BreadcrumbList` (Home → Blog → Post). Index page: `Blog` with its posts.

Site-wide:

- `sitemap.ts`: add `/landing/blog` and every published post with
  `lastModified = updatedAt`; switch doc entries to their `lastUpdated` instead
  of `new Date()`. Add `/landing/blog` to `PUBLIC_SEO_STATIC_ROUTES`.
  Include blog routes in `lib/functions/seoAudit.ts` (the `/admin/seo` audit).
- `robots.ts`: allow `/landing/blog`; add explicit rules for AI crawlers
  (at least GPTBot, OAI-SearchBot, ClaudeBot, PerplexityBot, Google-Extended)
  with the same allow/disallow lists as `*`.
- `/llms.txt` (route handler at `apps/web/app/llms.txt/route.ts`): site name and
  description from site config, then sections linking docs and published posts,
  each with a one-line description, following the llms.txt convention.
- Markdown endpoints for posts and docs (owner did not specify; builder's call
  on the exact path, for example `/landing/blog/[slug]/markdown`), returning
  `text/markdown` with title and summary at the top; referenced from `llms.txt`.
- RSS 2.0 at `/landing/blog/rss.xml`, advertised via
  `<link rel="alternate" type="application/rss+xml">` on blog pages.

## Mobile

- Reader: `apps/mobile/app/(home)/blog/` (index and `page/[slug]`), hidden tab
  like `documentation`, reached from where documentation is reached today.
- Admin: `"blog"` section in `apps/mobile/app/(home)/admin.tsx`, a
  `components/admin/BlogManagement.tsx` and `lib/blog-admin-api.ts`, mirroring
  `DocManagement` and `documentation-admin-api.ts`.

## Desktop

- `components/blog/BlogRoute.tsx` and `BlogPostPage.tsx`, routes `/blog` and
  `/blog/:slug` in `App.tsx`, linked wherever the doc reader is linked.

## Sample content

Two short neutral posts in the registry (for example, "Welcome to the blog" and
one showing headings, code, a table and a TL;DR), so a fresh install and the
`constant` CMS show a working blog. See the open question below on whether root
and starter content differ.

## Docs

Update `packages/database/src/docs/content-management.mdx` with a Blog section
(writing posts as files vs in the admin, drafts, what the SEO plumbing does).
This doc ships to buyers and `cms:refresh` is root-only, so it tells buyers to
re-run `pnpm seed` or use `/admin/blog`, and does not mention `cms:refresh`.
*(Builder-check call.)*

## Verification

- `pnpm generate`, `prisma validate`, `pnpm --dir apps/web typecheck`,
  `pnpm --dir apps/web test` (add `tests/integration/blogProcedures.test.ts`
  modelled on `docProcedures.test.ts`, including draft-hiding and admin-only
  writes), `pnpm arch:check`, `pnpm i18n:check`, `pnpm lint`.
- `pnpm template:sync` then `pnpm template:check-sync`; `pnpm template:build`.
- `pnpm scaffold:matrix --static` (blog touches files with `audit_log` and `ai`
  markers).
- With the dev server: `curl` an article and confirm title, body text and
  JSON-LD are in the raw HTML; `curl /llms.txt`, `/sitemap.xml`, `/robots.txt`,
  `/landing/blog/rss.xml`; confirm a draft appears in none of them.
- Final response notes that a migration is needed (owner runs `pnpm migrate`,
  then `migrate:deploy` on production).

## Left to the builder

Component structure and styling (match docs and landing), reading-time formula,
tag filter UI, related-posts heuristic, cache TTL, exact markdown endpoint path,
whether the article page renders via tRPC prefetch (like docs) or a direct lib
call (either is fine if goal 3 holds).

## Root vs starter content (owner decision)

Buyers get only the sample posts; SaaS Forge's own posts stay root-only.

- Root `packages/database/src/constants/blog.ts` lists SaaS Forge's posts (and
  may keep the samples until real posts exist; builder's call).
- The starter gets an override of `constants/blog.ts` listing only the sample
  posts, registered under `templateOverrides` in `template-sync.manifest.json`
  and backed by `template-overrides/saas-boilerplate/`.
- SaaS Forge post MDX files must not reach the starter. Either keep them in a
  root-only location excluded via the manifest `exclude` list, or keep the
  sample MDX files as overrides; builder's call, as long as
  `pnpm template:check-sync` passes and the staged starter contains no SaaS
  Forge post.

## Delivery

The owner's pre-existing uncommitted CMS work is committed first on `main` as
its own commit; the blog lands afterwards on `main` as a separate commit (local,
not pushed).
