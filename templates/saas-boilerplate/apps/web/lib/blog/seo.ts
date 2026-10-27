import type { Metadata } from "next";
import { siteMetadata } from "@/lib/site-config/metadata";
import { getSiteConfig } from "@/lib/site-config/service";
import { getCanonicalUrl, getSiteUrl } from "@/lib/seo";
import type { BlogPost } from "@/lib/ts-types/blog";
import type { JsonLdSite } from "./jsonld";

export const BLOG_RSS_PATH = "/landing/blog/rss.xml";

export async function getJsonLdSite(logo?: string): Promise<JsonLdSite> {
  const config = await getSiteConfig();
  const siteUrl = getSiteUrl();
  return {
    siteUrl,
    siteName: config["branding.saasName"],
    logoUrl: logo ? (logo.startsWith("http") ? logo : getCanonicalUrl(logo)) : getCanonicalUrl("/favicon.ico"),
  };
}

export async function blogPostMetadata(post: BlogPost): Promise<Metadata> {
  const pathname = `/landing/blog/${post.slug}`;
  const base = await siteMetadata({
    title: post.seoTitle || post.title,
    description: post.seoDescription || post.excerpt,
    pathname,
  });

  return {
    ...base,
    authors: [{ name: post.authorName }],
    keywords: post.tags,
    alternates: {
      canonical: post.canonicalUrl || getCanonicalUrl(pathname),
      types: { "application/rss+xml": getCanonicalUrl(BLOG_RSS_PATH) },
    },
    openGraph: {
      ...base.openGraph,
      type: "article",
      publishedTime: post.publishedAt,
      modifiedTime: post.updatedAt,
      authors: [post.authorName],
      tags: post.tags,
      ...(post.coverImage ? { images: [{ url: post.coverImage, alt: post.title }] } : {}),
    },
    twitter: {
      ...base.twitter,
      ...(post.coverImage ? { images: [post.coverImage] } : {}),
    },
  };
}
