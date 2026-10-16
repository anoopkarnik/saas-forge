import { NextRequest, NextResponse } from "next/server";
import { authenticateApiKey } from "@/server/authenticateApiKey";
import { InvalidScaffoldModuleError } from "@/lib/scaffold-modules";
import { getProject, updateProject } from "@/lib/scaffold/project-service";
import { updateProjectInput } from "@/lib/scaffold/project-inputs";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ slug: string }> };

export async function GET(req: NextRequest, ctx: RouteContext) {
  const auth = await authenticateApiKey(req, { scopes: ["read:projects"] });
  if (!auth.ok) return auth.response;

  const { slug } = await ctx.params;
  const project = await getProject(auth.userId, slug);

  if (!project) {
    return NextResponse.json(
      { error: { code: "not_found", message: "Project not found." } },
      { status: 404 },
    );
  }

  return NextResponse.json({ project });
}

export async function PATCH(req: NextRequest, ctx: RouteContext) {
  const auth = await authenticateApiKey(req, { scopes: ["write:projects"] });
  if (!auth.ok) return auth.response;

  const { slug } = await ctx.params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: { code: "invalid_json", message: "Request body must be JSON." } },
      { status: 400 },
    );
  }

  const parsed = updateProjectInput.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "invalid_body", message: parsed.error.message } },
      { status: 400 },
    );
  }

  try {
    const project = await updateProject(auth.userId, slug, parsed.data);
    if (!project) {
      return NextResponse.json(
        { error: { code: "not_found", message: "Project not found." } },
        { status: 404 },
      );
    }
    return NextResponse.json({ project });
  } catch (err) {
    if (err instanceof InvalidScaffoldModuleError) {
      return NextResponse.json(
        { error: { code: "invalid_modules", message: err.message } },
        { status: 400 },
      );
    }
    throw err;
  }
}
