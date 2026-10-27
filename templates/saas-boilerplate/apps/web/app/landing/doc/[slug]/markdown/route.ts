import { textResponse } from "@/lib/blog/http";
import { fetchDocumentationContent } from "@/lib/functions/fetchDocumentationContent";

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }): Promise<Response> {
  const { slug } = await params;
  const content = await fetchDocumentationContent(slug).catch(() => null);
  if (content === null) return textResponse("Not found\n", "text/plain", 404);

  return textResponse(content, "text/markdown");
}
