import type { MetadataRoute } from "next";
import { fetchDocumentation } from "@/lib/functions/fetchDocumentation";
import { getCachedBlogIndex } from "@/lib/blog/cache";
import { getCanonicalUrl, PUBLIC_SEO_STATIC_ROUTES } from "@/lib/seo";

export const revalidate = 600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const staticEntries: MetadataRoute.Sitemap = PUBLIC_SEO_STATIC_ROUTES.map((route) => ({
    url: getCanonicalUrl(route),
    lastModified: now,
    changeFrequency: route === "/landing/blog" ? "weekly" : "monthly",
    priority: route === "/landing" ? 1 : 0.7,
  }));

  let docEntries: MetadataRoute.Sitemap = [];

  try {
    const documentation = await fetchDocumentation();
    docEntries = documentation.docs.map((doc) => ({
      url: getCanonicalUrl(`/landing/doc/${doc.slug}`),
      lastModified: new Date(doc["Last edited time"]),
      changeFrequency: "weekly",
      priority: 0.7,
    }));
  } catch (error) {
    console.error("[SEO] sitemap documentation error:", error);
  }

  let blogEntries: MetadataRoute.Sitemap = [];

  try {
    const blog = await getCachedBlogIndex();
    blogEntries = blog.posts.map((post) => ({
      url: getCanonicalUrl(`/landing/blog/${post.slug}`),
      lastModified: new Date(post.updatedAt),
      changeFrequency: "weekly",
      priority: 0.7,
    }));
  } catch (error) {
    console.error("[SEO] sitemap blog error:", error);
  }

  return [...staticEntries, ...docEntries, ...blogEntries];
}
