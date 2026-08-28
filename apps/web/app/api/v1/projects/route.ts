import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import db from "@workspace/database/client";
import { authenticateApiKey } from "@/server/authenticateApiKey";
import { projectListSelect } from "@/lib/scaffold/project-selects";
import { InvalidScaffoldModuleError } from "@/lib/scaffold-modules";
import { createProject } from "@/lib/scaffold/project-write";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const auth = await authenticateApiKey(req, { scopes: ["read:projects"] });
  if (!auth.ok) return auth.response;

  const projects = await db.projectConfig.findMany({
    where: { userId: auth.userId },
    select: projectListSelect,
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json({ projects });
}

const createInput = z.object({
  name: z.string().trim().min(1).max(80),
  productTypeId: z.string().trim().min(1).optional(),
  tierId: z.string().trim().min(1).default("tier-1"),
  versionId: z.string().trim().min(1).default("balanced"),
  platforms: z.array(z.string()).min(1).default(["web"]),
  modules: z.array(z.string()).default([]),
  config: z.record(z.string(), z.any()).default({}),
});

export async function POST(req: NextRequest) {
  const auth = await authenticateApiKey(req, { scopes: ["write:projects"] });
  if (!auth.ok) return auth.response;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: { code: "invalid_json", message: "Request body must be JSON." } },
      { status: 400 },
    );
  }

  const parsed = createInput.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "invalid_body", message: parsed.error.message } },
      { status: 400 },
    );
  }

  try {
    const { project, strippedKeys } = await createProject(auth.userId, parsed.data);
    return NextResponse.json({ project, strippedKeys }, { status: 201 });
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
