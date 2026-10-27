import { describe, expect, it } from "vitest";
import { buildLlmsTxt, buildPostMarkdown, buildRssXml } from "../feeds";
import type { BlogPost, BlogPostSummary } from "@/lib/ts-types/blog";

const site = { siteUrl: "https://acme.test", siteName: "Acme & Co", description: "Tools <for> builders" };

const summary: BlogPostSummary = {
  id: "post_1",
  slug: "hello-world",
  title: 'Tips & "tricks" <2026>',
  excerpt: "Fish & chips <b>bold</b>",
  summary: null,
  coverImage: null,
  authorName: "Ann",
  authorAvatar: null,
  tags: ["news"],
  publishedAt: "2026-10-01T09:30:00.000Z",
  updatedAt: "2026-10-02T00:00:00.000Z",
  readingMinutes: 2,
};

const post: BlogPost = { ...summary, content: "## Body\n\nText.", seoTitle: null, seoDescription: null, canonicalUrl: null };

describe("blog feeds", () => {
  it("buildRssXml escapes &, <, > and quotes in titles and excerpts", () => {
    const xml = buildRssXml([summary], site);
    const doc = new DOMParser().parseFromString(xml, "application/xml");

    expect(doc.getElementsByTagName("parsererror")).toHaveLength(0);
    expect(doc.querySelector("item > title")?.textContent).toBe('Tips & "tricks" <2026>');
    expect(doc.querySelector("channel > title")?.textContent).toBe("Acme & Co");
  });

  it("buildRssXml lists posts with absolute links and RFC-822 pubDate", () => {
    const xml = buildRssXml([summary], site);

    expect(xml).toContain("<link>https://acme.test/landing/blog/hello-world</link>");
    expect(xml).toContain("<pubDate>Thu, 01 Oct 2026 09:30:00 GMT</pubDate>");
    expect(xml).toContain('<atom:link href="https://acme.test/landing/blog/rss.xml" rel="self" type="application/rss+xml"/>');
  });

  it("buildLlmsTxt lists docs and posts linking to markdown endpoints", () => {
    const text = buildLlmsTxt({
      siteName: "Acme",
      description: "Tools for builders",
      siteUrl: "https://acme.test",
      docs: [{ title: "Overview", slug: "overview" }],
      posts: [summary],
    });

    expect(text.startsWith("# Acme\n\n> Tools for builders\n")).toBe(true);
    expect(text).toContain("## Docs\n\n- [Overview](https://acme.test/landing/doc/overview/markdown)");
    expect(text).toContain("## Blog\n\n- [Tips & \"tricks\" <2026>](https://acme.test/landing/blog/hello-world/markdown): Fish & chips <b>bold</b>");
  });

  it("buildLlmsTxt omits empty sections", () => {
    const text = buildLlmsTxt({ siteName: "Acme", description: "d", siteUrl: "https://acme.test", docs: [], posts: [] });
    expect(text).not.toContain("## Blog");
    expect(text).not.toContain("## Docs");
  });

  it("buildPostMarkdown includes TL;DR only when summary exists", () => {
    expect(buildPostMarkdown(post, "https://acme.test")).not.toContain("TL;DR");

    const md = buildPostMarkdown({ ...post, summary: "Short answer" }, "https://acme.test");
    expect(md.startsWith("# Tips & \"tricks\" <2026>\n")).toBe(true);
    expect(md).toContain("> **TL;DR:** Short answer");
    expect(md).toContain("## Body");
    expect(md).toContain("Source: https://acme.test/landing/blog/hello-world");
  });
});
