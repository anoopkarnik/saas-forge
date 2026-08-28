import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import db from "@workspace/database/client";
import { authenticateApiKey } from "@/server/authenticateApiKey";
import { projectDetailSelect } from "@/lib/scaffold/project-selects";
import { InvalidScaffoldModuleError } from "@/lib/scaffold-modules";
import { updateProject } from "@/lib/scaffold/project-write";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ slug: string }> };

export async function GET(req: NextRequest, ctx: RouteContext) {
  const auth = await authenticateApiKey(req, { scopes: ["read:projects"] });
  if (!auth.ok) return auth.response;

  const { slug } = await ctx.params;
  const project = await db.projectConfig.findFirst({
    where: { userId: auth.userId, slug },
    select: projectDetailSelect,
  });

  if (!project) {
    return NextResponse.json(
      { error: { code: "not_found", message: "Project not found." } },
      { status: 404 },
    );
  }

  return NextResponse.json({ project });
}

const patchInput = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  productTypeId: z.string().trim().min(1).nullable().optional(),
  tierId: z.string().trim().min(1).optional(),
  versionId: z.string().trim().min(1).optional(),
  platforms: z.array(z.string()).min(1).optional(),
  modules: z.array(z.string()).optional(),
  config: z.record(z.string(), z.any()).optional(),
});

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

  const parsed = patchInput.safeParse(body);
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
