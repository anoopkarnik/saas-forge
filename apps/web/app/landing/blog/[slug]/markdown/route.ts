import { buildPostMarkdown } from "@/lib/blog/feeds";
import { textResponse } from "@/lib/blog/http";
import { fetchBlogPost } from "@/lib/functions/fetchBlog";
import { getSiteUrl } from "@/lib/seo";

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }): Promise<Response> {
  const { slug } = await params;
  const post = await fetchBlogPost(slug);
  if (!post) return textResponse("Not found\n", "text/plain", 404);

  return textResponse(buildPostMarkdown(post, getSiteUrl()), "text/markdown");
}
