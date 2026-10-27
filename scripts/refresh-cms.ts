/** Targeted content refresh for this source repo. Preview by default; --apply writes. */
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import dotenv from "dotenv";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
dotenv.config({ path: path.join(root, "packages/database/.env"), quiet: true });
dotenv.config({ path: path.join(root, "apps/web/.env"), quiet: true });

const updatedSlugs = new Set([
  "overview",
  "features",
  "modules-overview",
  "architecture",
  "ai-agents",
  "billing",
  "upgrading",
  "using-cli",
  "tech-stack",
  "content-management",
  "background-jobs",
  "notifications",
  "audit-log",
  "outgoing-webhooks",
  "feature-flags",
  "onboarding",
  "product-analytics",
  "mcp",
  "usage-ledger",
  "runtime-settings",
  "internationalization",
  "launchpad",
]);

async function main() {
  const args = process.argv.slice(2);
  if (args.some((arg) => !["--apply", "--publish-assets"].includes(arg)))
    throw new Error("Usage: pnpm cms:refresh [--apply] [--publish-assets]");
  if (args.includes("--publish-assets") && !args.includes("--apply"))
    throw new Error("Use --publish-assets together with --apply.");
  const name = process.env.NEXT_PUBLIC_SAAS_NAME;
  if (!name || !process.env.DATABASE_URL)
    throw new Error(
      "Configure NEXT_PUBLIC_SAAS_NAME and DATABASE_URL locally first.",
    );
  const { landingPageData, documentationData } =
    await import("../packages/database/src/constants/index.ts");
  const { default: prisma } =
    await import("../packages/database/src/client.ts");
  try {
    const hero = landingPageData.heroSection;
    const features = landingPageData.featureSection;
    const faq = landingPageData.faqSection;
    const docs = await Promise.all(
      documentationData
        .filter((doc) => updatedSlugs.has(doc.slug))
        .map(async (doc) => ({
          slug: doc.slug,
          title: doc.title,
          type: doc.type,
          order: doc.order,
          content: await fs.readFile(
            path.join(root, "packages/database/src/docs", doc.filePath),
            "utf8",
          ),
        })),
    );
    if (docs.length !== updatedSlugs.size)
      throw new Error(
        "Refresh list contains an unregistered documentation slug.",
      );
    for (const item of [...hero.heroImages, ...features.features]) {
      if (!item.imageUrl.startsWith("/cms/"))
        throw new Error("Expected a local CMS asset.");
      await fs.access(path.join(root, "apps/web/public", item.imageUrl));
    }
    const existing = await prisma.landingPage.findUnique({
      where: { title: name },
      include: {
        heroImages: true,
        features: true,
        faqs: true,
        documentations: { where: { slug: { in: [...updatedSlugs] } } },
      },
    });
    if (!existing)
      throw new Error(
        "No existing CMS landing page for this name. Initialize it before refreshing.",
      );
    const conflicts = await prisma.documentation.count({
      where: {
        slug: { in: [...updatedSlugs] },
        landingPageId: { not: existing.id },
      },
    });
    if (conflicts)
      throw new Error(
        "A documentation slug belongs to another landing page; resolve it before refreshing.",
      );
    console.log(
      `CMS: ${name}. Refresh ${hero.heroImages.length} hero images, ${features.features.length} features, ${faq.faqs.length} FAQs and ${docs.length} guides.`,
    );
    console.log(
      `Current CMS: ${existing.heroImages.length} hero images, ${existing.features.length} features, ${existing.faqs.length} FAQs; ${existing.documentations.length} matching guides.`,
    );
    console.log(
      "Pricing, testimonials, legal/contact data, navigation, other guides and user data are preserved.",
    );
    if (!args.includes("--apply")) {
      console.log(
        "Preview only. Use pnpm cms:refresh --apply to back up and apply this content.",
      );
      return;
    }
    const backupDir = path.join(
      os.homedir(),
      ".local/state/saas-forge/cms-backups",
    );
    await fs.mkdir(backupDir, { recursive: true, mode: 0o700 });
    const backupPath = path.join(
      backupDir,
      `${new Date().toISOString().replaceAll(":", "-")}.json`,
    );
    await fs.writeFile(backupPath, JSON.stringify(existing, null, 2), {
      mode: 0o600,
      flag: "wx",
    });
    console.log(`Backup: ${backupPath}`);
    // Publishing first keeps a remote CMS usable before this checkout is deployed.
    const published = new Map<string, string>();
    const landingImages = new Map<string, string>();
    if (args.includes("--publish-assets")) {
      const { uploadNormalizedImage } =
        await import("../apps/web/server/uploads/image-upload.ts");
      const localImages = new Set([
        ...hero.heroImages.map((item) => item.imageUrl),
        ...features.features.map((item) => item.imageUrl),
        ...docs.flatMap((doc) =>
          [...doc.content.matchAll(/\/cms\/v2\/[a-z0-9-]+\.png/g)].map(
            (match) => match[0],
          ),
        ),
      ]);
      for (const local of localImages) {
        const buffer = await fs.readFile(
          path.join(root, "apps/web/public", local),
        );
        const url = await uploadNormalizedImage({
          buffer,
          extension: "png",
          contentType: "image/png",
          keyPrefix: "cms-images/feature-refresh-v2",
        });
        const response = await fetch(url, {
          signal: AbortSignal.timeout(20_000),
        });
        if (
          !response.ok ||
          !response.headers.get("content-type")?.startsWith("image/png")
        )
          throw new Error(
            `Published image is not publicly readable: ${path.basename(local)}`,
          );
        if (!Buffer.from(await response.arrayBuffer()).equals(buffer))
          throw new Error(
            `Published image differs from its source: ${path.basename(local)}`,
          );
        published.set(local, url);
        console.log(
          `Published and verified ${path.basename(local)} (${published.size}/${localImages.size}).`,
        );
      }
      // The deployed next/image allowlist may predate this storage provider.
      // Inline lossless WebP works immediately; Markdown uses the public URLs.
      const require = createRequire(path.join(root, "apps/web/package.json"));
      const sharp = require("sharp");
      for (const item of [...hero.heroImages, ...features.features]) {
        if (landingImages.has(item.imageUrl)) continue;
        const buffer = await sharp(
          await fs.readFile(path.join(root, "apps/web/public", item.imageUrl)),
        )
          .webp({ lossless: true })
          .toBuffer();
        landingImages.set(
          item.imageUrl,
          `data:image/webp;base64,${buffer.toString("base64")}`,
        );
      }
      console.log(
        "Landing images use inline lossless WebP for compatibility with deployed image-host restrictions.",
      );
      await fs.writeFile(
        backupPath.replace(/\.json$/, ".assets.json"),
        JSON.stringify(Object.fromEntries(published), null, 2),
        { mode: 0o600, flag: "wx" },
      );
      for (const doc of docs) {
        for (const [local, url] of published)
          doc.content = doc.content.replaceAll(local, url);
      }
    }
    const imageUrlFor = (url: string) => landingImages.get(url) ?? url;
    await prisma.$transaction(
      async (tx) => {
        await tx.landingPage.update({
          where: { id: existing.id },
          data: {
            tagline: hero.tagline,
            description: hero.description,
            codeSnippet: hero.codeSnippet,
            featureHeading: features.heading,
            featureDescription: features.description,
            faqHeading: faq.heading,
            faqDescription: faq.description,
          },
        });
        await tx.heroImage.deleteMany({
          where: { landingPageId: existing.id },
        });
        await tx.heroImage.createMany({
          data: hero.heroImages.map(({ title, imageUrl }) => ({
            landingPageId: existing.id,
            title,
            imageUrl: imageUrlFor(imageUrl),
          })),
        });
        await tx.feature.deleteMany({ where: { landingPageId: existing.id } });
        await tx.feature.createMany({
          data: features.features.map(
            ({ title, description, imageUrl, category }) => ({
              landingPageId: existing.id,
              title,
              description,
              imageUrl: imageUrlFor(imageUrl),
              category,
            }),
          ),
        });
        await tx.fAQ.deleteMany({ where: { landingPageId: existing.id } });
        await tx.fAQ.createMany({
          data: faq.faqs.map(({ question, answer }) => ({
            landingPageId: existing.id,
            question,
            answer,
          })),
        });
        for (const doc of docs) {
          await tx.documentation.upsert({
            where: { slug: doc.slug },
            update: {
              ...doc,
              landingPageId: existing.id,
              lastUpdated: new Date(),
            },
            create: { ...doc, landingPageId: existing.id },
          });
        }
      },
      { timeout: 30_000 },
    );
    const saved = await prisma.landingPage.findUniqueOrThrow({
      where: { id: existing.id },
      include: {
        heroImages: true,
        features: true,
        faqs: true,
        documentations: { where: { slug: { in: [...updatedSlugs] } } },
      },
    });
    for (const [key, value] of Object.entries(existing)) {
      if (
        ![
          "heroImages",
          "features",
          "faqs",
          "documentations",
          "tagline",
          "description",
          "codeSnippet",
          "featureHeading",
          "featureDescription",
          "faqHeading",
          "faqDescription",
        ].includes(key) &&
        JSON.stringify(value) !==
          JSON.stringify(saved[key as keyof typeof saved])
      )
        throw new Error(
          `Unexpected change to preserved field ${key}. Inspect backup.`,
        );
    }
    if (
      saved.features.length !== features.features.length ||
      saved.heroImages.length !== hero.heroImages.length ||
      saved.faqs.length !== faq.faqs.length ||
      saved.documentations.length !== docs.length ||
      hero.heroImages.some(
        (item) =>
          saved.heroImages.find((row) => row.title === item.title)?.imageUrl !==
          imageUrlFor(item.imageUrl),
      ) ||
      features.features.some(
        (item) =>
          saved.features.find((row) => row.title === item.title)?.imageUrl !==
          imageUrlFor(item.imageUrl),
      ) ||
      docs.some(
        (doc) =>
          saved.documentations.find((row) => row.slug === doc.slug)?.content !==
          doc.content,
      )
    )
      throw new Error("CMS verification failed. Inspect backup.");
    if (
      process.env.UPSTASH_REDIS_REST_URL &&
      process.env.UPSTASH_REDIS_REST_TOKEN
    ) {
      const require = createRequire(path.join(root, "apps/web/package.json"));
      const { Redis } = require("@upstash/redis");
      const redis = new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      });
      try {
        await redis.del(
          `${name.toLowerCase()}-landing-page:cms:v1`,
          `${name.toLowerCase()}-documentation:v1`,
        );
        console.log("Cleared landing and documentation caches.");
      } catch {
        console.log(
          "Content saved and verified; cache invalidation failed. Cached content expires within one hour.",
        );
        process.exitCode = 1;
      }
    }
    console.log("CMS content saved and read-back verified.");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  // Do not print database connection strings or provider credentials from errors.
  console.error(
    error instanceof Error && !/(postgres|https?):\/\//i.test(error.message)
      ? error.message
      : "CMS refresh failed. Check the local database configuration.",
  );
  process.exitCode = 1;
});
