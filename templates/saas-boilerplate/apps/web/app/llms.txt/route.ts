import { getCachedBlogIndex } from "@/lib/blog/cache";
import { buildLlmsTxt } from "@/lib/blog/feeds";
import { textResponse } from "@/lib/blog/http";
import { fetchDocumentation } from "@/lib/functions/fetchDocumentation";
import { getSiteUrl } from "@/lib/seo";
import { getSiteConfig } from "@/lib/site-config/service";

export async function GET(): Promise<Response> {
  const config = await getSiteConfig();
  const [documentation, blog] = await Promise.all([
    fetchDocumentation().catch((error) => {
      console.error("[llms.txt] documentation error:", error);
      return null;
    }),
    getCachedBlogIndex().catch((error) => {
      console.error("[llms.txt] blog error:", error);
      return null;
    }),
  ]);

  return textResponse(
    buildLlmsTxt({
      siteName: config["branding.saasName"],
      description: config["branding.description"],
      siteUrl: getSiteUrl(),
      docs: (documentation?.docs ?? []).map((doc) => ({ title: doc.Name, slug: doc.slug })),
      posts: blog?.posts ?? [],
    }),
    "text/plain",
  );
}
