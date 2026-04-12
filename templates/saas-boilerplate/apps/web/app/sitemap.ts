import type { MetadataRoute } from "next";
import { fetchDocumentation } from "@/lib/functions/fetchDocumentation";
import { getCanonicalUrl, PUBLIC_SEO_STATIC_ROUTES } from "@/lib/seo";

export const revalidate = 600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  let docRoutes: string[] = [];

  try {
    const documentation = await fetchDocumentation();
    docRoutes = documentation.docs.map((doc) => `/landing/doc/${doc.slug}`);
  } catch (error) {
    console.error("[SEO] sitemap documentation error:", error);
  }

  const routes = [...PUBLIC_SEO_STATIC_ROUTES, ...docRoutes];
  const lastModified = new Date();

  return routes.map((route) => ({
    url: getCanonicalUrl(route),
    lastModified,
    changeFrequency: route.startsWith("/landing/doc") ? "weekly" : "monthly",
    priority: route === "/landing" ? 1 : 0.7,
  }));
}
