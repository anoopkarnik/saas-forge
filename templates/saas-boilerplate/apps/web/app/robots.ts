import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/seo";

const allow = [
  "/landing",
  "/landing/doc",
  "/landing/blog",
  "/landing/legal",
  "/llms.txt",
  "/sign-in",
  "/sign-up",
];

const disallow = [
  "/admin",
  "/api",
  "/auth-callback",
  "/email-verified",
  "/error",
  "/forgot-password",
  "/reset-password",
];

// Named explicitly so AI search and assistant crawlers are welcome even if a
// host or CDN adds a default block for them.
const AI_CRAWLERS = [
  "GPTBot",
  "OAI-SearchBot",
  "ChatGPT-User",
  "ClaudeBot",
  "Claude-User",
  "PerplexityBot",
  "Google-Extended",
];

export default function robots(): MetadataRoute.Robots {
  const siteUrl = getSiteUrl();

  return {
    rules: [
      { userAgent: "*", allow, disallow },
      { userAgent: AI_CRAWLERS, allow, disallow },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
