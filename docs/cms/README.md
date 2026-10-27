# Refreshing the SaaS Forge CMS

The default content now describes the 13 implemented optional modules, core runtime settings and localization, plus the platform's Launchpad and release-update flow. The landing page has 20 feature entries, 4 hero diagrams and 9 FAQs. Twelve guides extend the existing documentation index.

## Preview and apply to the configured Postgres CMS

These commands belong to the full SaaS Forge source repository:

```bash
pnpm cms:refresh
pnpm cms:refresh --apply --publish-assets
```

The first command reads and validates the proposed content without writing. For a CMS using deployed local assets, `--apply` alone keeps local image paths. The `--publish-assets` option uploads every referenced PNG to the configured image provider and verifies its public bytes before writing records, so documentation in a remote CMS can use the refresh immediately. Landing images use inline lossless WebP because the deployed Next.js image-host allowlist may not accept the configured storage host; this adds about 510 KiB of image data before base64 encoding. After deploying the bundled assets, `--apply` without `--publish-assets` uses separate local image URLs again. The second command saves a private JSON backup under `~/.local/state/saas-forge/cms-backups/`, then applies the targeted changes in one database transaction and reads them back to verify the result. It uses `packages/database/.env`, then `apps/web/.env`, matching the existing seed precedence. Review the configured database before applying to a different environment.

The refresh replaces hero images, feature entries and FAQs, updates their headings and descriptions, and upserts only its listed documentation pages. It preserves pricing, testimonials, legal/contact data, navigation, other documentation and user data. Existing landing rows must already exist, and documentation slugs owned by a different landing page cause a refusal. The backup includes the previous landing fields, replaced collections and affected guides; retain it if you want to restore earlier copy.

When configured, the refresh deletes the same two Upstash cache keys the CMS uses. A cache failure is reported after the committed database update; cached content otherwise expires within an hour. This refresh does not run a database migration or the broad `pnpm seed` command. If a running Next.js development server still shows old content, restart it to clear its HMR fetch cache; Redis invalidation alone does not clear that development cache.

New deployments using constant CMS read the updated constants directly. Future `pnpm seed` runs also use the refreshed default content, but seed replaces other CMS sections too: use it deliberately.

## Visual library

```bash
pnpm cms:visuals
```

This recreates the images using local SVG and sharp, without an external generation API. PNGs are served from `apps/web/public/cms/v2/`, alongside editable SVG sources. `visuals.html` is a self-contained gallery for reviewing every illustration. Charcoal backgrounds, green accents and muted gray connectors match the live landing theme. The images keep their dark palette in light mode, with high-contrast labels on every surface.

Seven diagrams explain architecture, module compilation, event delivery, release upgrades, scoped MCP access, Launchpad and Python AI execution. Twenty feature illustrations describe each entry's workflow. Markdown embeds the PNGs, so diagrams render with the existing `react-markdown` setup. All images have accompanying text or alt descriptions.

Edit `scripts/generate-cms-visuals.mjs` for diagram labels and flow geometry. Feature titles come from `packages/database/src/constants/features.ts`. Update source content rather than editing the managed starter: run `pnpm template:sync` and `pnpm template:check-sync` after changing shared defaults or images.
