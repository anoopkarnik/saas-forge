import { NextRequest, NextResponse } from "next/server";
import { authenticateApiKey } from "@/server/authenticateApiKey";
import { InvalidScaffoldModuleError } from "@/lib/scaffold-modules";
import { createProject, listProjects } from "@/lib/scaffold/project-service";
import { createProjectInput } from "@/lib/scaffold/project-inputs";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const auth = await authenticateApiKey(req, { scopes: ["read:projects"] });
  if (!auth.ok) return auth.response;

  const projects = await listProjects(auth.userId);

  return NextResponse.json({ projects });
}

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

  const parsed = createProjectInput.safeParse(body);
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
