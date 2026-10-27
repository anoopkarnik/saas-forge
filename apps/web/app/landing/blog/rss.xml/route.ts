import { getCachedBlogIndex } from "@/lib/blog/cache";
import { buildRssXml } from "@/lib/blog/feeds";
import { textResponse } from "@/lib/blog/http";
import { getSiteUrl } from "@/lib/seo";
import { getSiteConfig } from "@/lib/site-config/service";

export async function GET(): Promise<Response> {
  const [index, config] = await Promise.all([getCachedBlogIndex(), getSiteConfig()]);

  return textResponse(
    buildRssXml(index.posts, {
      siteUrl: getSiteUrl(),
      siteName: config["branding.saasName"],
      description: config["branding.description"],
    }),
    "application/rss+xml",
  );
}
