import type { BlogPost, BlogPostSummary } from "@/lib/ts-types/blog";

export interface JsonLdSite {
  siteUrl: string;
  siteName: string;
  logoUrl: string;
}

export const blogPostUrl = (siteUrl: string, slug: string) => `${siteUrl}/landing/blog/${slug}`;

const publisher = (site: JsonLdSite) => ({
  "@type": "Organization",
  name: site.siteName,
  logo: { "@type": "ImageObject", url: site.logoUrl },
});

export function blogPostingJsonLd(post: BlogPost, site: JsonLdSite): Record<string, unknown> {
  const url = blogPostUrl(site.siteUrl, post.slug);
  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.seoTitle || post.title,
    description: post.seoDescription || post.excerpt,
    ...(post.coverImage ? { image: post.coverImage } : {}),
    datePublished: post.publishedAt,
    dateModified: post.updatedAt,
    author: { "@type": "Person", name: post.authorName },
    publisher: publisher(site),
    keywords: post.tags.join(", "),
    url,
    mainEntityOfPage: { "@type": "WebPage", "@id": post.canonicalUrl || url },
  };
}

export function breadcrumbJsonLd(items: { name: string; url: string }[]): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

export function blogIndexJsonLd(posts: BlogPostSummary[], site: JsonLdSite): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "Blog",
    name: `${site.siteName} Blog`,
    url: `${site.siteUrl}/landing/blog`,
    publisher: publisher(site),
    blogPost: posts.map((post) => ({
      "@type": "BlogPosting",
      headline: post.title,
      description: post.excerpt,
      datePublished: post.publishedAt,
      dateModified: post.updatedAt,
      author: { "@type": "Person", name: post.authorName },
      url: blogPostUrl(site.siteUrl, post.slug),
    })),
  };
}
