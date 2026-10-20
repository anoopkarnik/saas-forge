import { NextRequest, NextResponse } from "next/server";
import { authenticateApiKey } from "@/server/authenticateApiKey";
import { markProjectCurrent } from "@/lib/scaffold/project-service";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ slug: string }> };

/**
 * POST /api/v1/projects/[slug]/mark-current — records that the owner applied
 * the releases since the project's version by hand. Free, no body.
 */
export async function POST(req: NextRequest, ctx: RouteContext) {
  const auth = await authenticateApiKey(req, { scopes: ["write:projects"] });
  if (!auth.ok) return auth.response;

  const { slug } = await ctx.params;
  const result = await markProjectCurrent(auth.userId, slug);

  switch (result.status) {
    case "not_found":
      return NextResponse.json(
        { error: { code: "not_found", message: "Project not found." } },
        { status: 404 },
      );
    case "not_downloaded":
      return NextResponse.json(
        {
          error: {
            code: "not_downloaded",
            message: "This project was never downloaded; its first download already gets the latest version.",
          },
        },
        { status: 409 },
      );
    case "current":
      return NextResponse.json({
        fromVersion: result.templateVersion,
        templateVersion: result.templateVersion,
        alreadyCurrent: true,
      });
    case "marked":
      return NextResponse.json({
        fromVersion: result.fromVersion,
        templateVersion: result.templateVersion,
        alreadyCurrent: false,
      });
  }
}
