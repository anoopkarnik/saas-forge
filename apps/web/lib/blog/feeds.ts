import type { BlogPost, BlogPostSummary } from "@/lib/ts-types/blog";
import { blogPostUrl } from "./jsonld";
import { BLOG_RSS_PATH } from "./seo";

const escapeXml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

export function buildRssXml(
  posts: BlogPostSummary[],
  site: { siteUrl: string; siteName: string; description: string },
): string {
  const items = posts
    .map((post) => {
      const url = blogPostUrl(site.siteUrl, post.slug);
      const categories = post.tags.map((tag) => `      <category>${escapeXml(tag)}</category>`).join("\n");
      return [
        "    <item>",
        `      <title>${escapeXml(post.title)}</title>`,
        `      <link>${url}</link>`,
        `      <guid isPermaLink="true">${url}</guid>`,
        `      <description>${escapeXml(post.excerpt)}</description>`,
        `      <pubDate>${new Date(post.publishedAt).toUTCString()}</pubDate>`,
        `      <author>${escapeXml(post.authorName)}</author>`,
        ...(categories ? [categories] : []),
        "    </item>",
      ].join("\n");
    })
    .join("\n");

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">',
    "  <channel>",
    `    <title>${escapeXml(site.siteName)}</title>`,
    `    <link>${site.siteUrl}/landing/blog</link>`,
    `    <description>${escapeXml(site.description)}</description>`,
    `    <atom:link href="${site.siteUrl}${BLOG_RSS_PATH}" rel="self" type="application/rss+xml"/>`,
    ...(posts[0] ? [`    <lastBuildDate>${new Date(posts[0].updatedAt).toUTCString()}</lastBuildDate>`] : []),
    ...(items ? [items] : []),
    "  </channel>",
    "</rss>",
    "",
  ].join("\n");
}

/** https://llmstxt.org: a markdown index of the pages worth reading, linking to their markdown copies. */
export function buildLlmsTxt(input: {
  siteName: string;
  description: string;
  siteUrl: string;
  docs: { title: string; slug: string }[];
  posts: BlogPostSummary[];
}): string {
  const sections: string[] = [`# ${input.siteName}`, `> ${input.description}`];

  if (input.docs.length > 0) {
    sections.push(
      "## Docs",
      input.docs.map((doc) => `- [${doc.title}](${input.siteUrl}/landing/doc/${doc.slug}/markdown)`).join("\n"),
    );
  }

  if (input.posts.length > 0) {
    sections.push(
      "## Blog",
      input.posts
        .map((post) => `- [${post.title}](${blogPostUrl(input.siteUrl, post.slug)}/markdown): ${post.excerpt}`)
        .join("\n"),
    );
  }

  return `${sections.join("\n\n")}\n`;
}

export function buildPostMarkdown(post: BlogPost, siteUrl: string): string {
  const published = post.publishedAt.slice(0, 10);
  const updated = post.updatedAt.slice(0, 10);
  const meta = `By ${post.authorName} · Published ${published}${updated !== published ? ` · Updated ${updated}` : ""}`;

  return [
    `# ${post.title}`,
    meta,
    ...(post.summary ? [`> **TL;DR:** ${post.summary}`] : []),
    post.content.trim(),
    `Source: ${post.canonicalUrl || blogPostUrl(siteUrl, post.slug)}`,
    "",
  ].join("\n\n");
}
