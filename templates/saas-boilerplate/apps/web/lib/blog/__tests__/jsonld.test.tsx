import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { blogIndexJsonLd, blogPostingJsonLd, breadcrumbJsonLd } from "../jsonld";
import JsonLd from "@/components/seo/JsonLd";
import type { BlogPost } from "@/lib/ts-types/blog";

const site = { siteUrl: "https://acme.test", siteName: "Acme", logoUrl: "https://acme.test/logo.png" };

const post: BlogPost = {
  id: "post_1",
  slug: "hello-world",
  title: "Hello world",
  excerpt: "An excerpt",
  summary: "Short answer",
  coverImage: "https://acme.test/cover.png",
  authorName: "Ann",
  authorAvatar: null,
  tags: ["news", "guides"],
  publishedAt: "2026-10-01T00:00:00.000Z",
  updatedAt: "2026-10-02T00:00:00.000Z",
  readingMinutes: 3,
  content: "# Hello",
  seoTitle: null,
  seoDescription: "SEO description",
  canonicalUrl: null,
};

describe("blog JSON-LD", () => {
  it("blogPostingJsonLd maps headline, dates, author, image and mainEntityOfPage", () => {
    expect(blogPostingJsonLd(post, site)).toMatchObject({
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      headline: "Hello world",
      description: "SEO description",
      datePublished: post.publishedAt,
      dateModified: post.updatedAt,
      author: { "@type": "Person", name: "Ann" },
      image: "https://acme.test/cover.png",
      keywords: "news, guides",
      mainEntityOfPage: { "@id": "https://acme.test/landing/blog/hello-world" },
      publisher: { name: "Acme" },
    });
  });

  it("omits image when the post has no cover", () => {
    expect(blogPostingJsonLd({ ...post, coverImage: null }, site)).not.toHaveProperty("image");
  });

  it("breadcrumbJsonLd numbers items from 1", () => {
    const data = breadcrumbJsonLd([
      { name: "Home", url: "https://acme.test/landing" },
      { name: "Blog", url: "https://acme.test/landing/blog" },
    ]);
    expect(data).toMatchObject({
      "@type": "BreadcrumbList",
      itemListElement: [
        { position: 1, name: "Home" },
        { "@type": "ListItem", position: 2, name: "Blog", item: "https://acme.test/landing/blog" },
      ],
    });
  });

  it("blogIndexJsonLd lists posts with their URLs", () => {
    expect(blogIndexJsonLd([post], site)).toMatchObject({
      "@type": "Blog",
      blogPost: [{ url: "https://acme.test/landing/blog/hello-world" }],
    });
  });

  it('JsonLd escapes "<" so a title with </script> cannot close the tag', () => {
    const html = renderToStaticMarkup(
      <JsonLd data={blogPostingJsonLd({ ...post, title: "</script><script>alert(1)</script>" }, site)} />,
    );
    expect(html).not.toContain("</script><script>");
    expect(html.match(/<\/script>/g)).toHaveLength(1);
    expect(html).toContain('type="application/ld+json"');
  });
});
