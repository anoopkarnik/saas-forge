import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  const siteUrl = getSiteUrl();

  return {
    rules: {
      userAgent: "*",
      allow: [
        "/landing",
        "/landing/doc",
        "/landing/legal",
        "/sign-in",
        "/sign-up",
      ],
      disallow: [
        "/admin",
        "/api",
        "/auth-callback",
        "/email-verified",
        "/error",
        "/forgot-password",
        "/reset-password",
      ],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
