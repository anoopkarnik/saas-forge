import { NextRequest, NextResponse } from "next/server";
import { authenticateApiKey } from "@/server/authenticateApiKey";
import { getProject, markProjectBuilt } from "@/lib/scaffold/project-service";
import {
  InvalidScaffoldModuleError,
  calculateScaffoldCredits,
  isPriceChanged,
  validateSelectedModules,
  type ScaffoldModuleId,
} from "@/lib/scaffold-modules";
import { getTemplateVersion } from "@/lib/scaffold/template-version";
import {
  InsufficientCreditsError,
  ScaffoldRootNotFoundError,
  buildProjectZip,
  chargeScaffoldCredits,
  computeBuildHash,
} from "@/lib/scaffold/service";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ slug: string }> };

function jsonError(code: string, message: string, status: number) {
  return NextResponse.json({ error: { code, message } }, { status });
}

export async function POST(req: NextRequest, ctx: RouteContext) {
  const auth = await authenticateApiKey(req, { scopes: ["scaffold:download"] });
  if (!auth.ok) return auth.response;

  const { slug } = await ctx.params;
  const project = await getProject(auth.userId, slug);
  if (!project) return jsonError("not_found", "Project not found.", 404);

  let modules: ScaffoldModuleId[];
  try {
    modules = validateSelectedModules(project.modules);
  } catch (err) {
    if (err instanceof InvalidScaffoldModuleError) {
      return jsonError("invalid_modules", err.message, 400);
    }
    throw err;
  }

  // Free re-download when nothing changed since the last build.
  const currentHash = computeBuildHash(project);
  const alreadyBuilt = !!project.lastBuiltHash && project.lastBuiltHash === currentHash;
  const amount = alreadyBuilt ? 0 : calculateScaffoldCredits(modules).totalCredits;

  // Optional JSON body: { expectedTotalCredits } guards against price changes.
  const body = (await req.json().catch(() => ({}))) as { expectedTotalCredits?: unknown };
  if (isPriceChanged(body?.expectedTotalCredits, amount)) {
    return jsonError("price_changed", `This download now costs ${amount} credits.`, 409);
  }
  const idempotencyKey = req.headers.get("Idempotency-Key") || undefined;

  let charge;
  try {
    charge = await chargeScaffoldCredits({
      userId: auth.userId,
      amount,
      idempotencyKey,
      job: {
        type: "download",
        source: "api",
        projectId: project.id,
        toModules: modules,
        toTierId: project.tierId,
        templateVersion: getTemplateVersion(),
      },
    });
  } catch (err) {
    if (err instanceof InsufficientCreditsError) {
      return jsonError("insufficient_credits", "Not enough credits.", 403);
    }
    throw err;
  }

  let build;
  try {
    build = buildProjectZip({
      name: project.name,
      projectName: project.slug,
      modules,
      platforms: project.platforms,
      config: (project.config ?? {}) as Record<string, unknown>,
      productTypeId: project.productTypeId,
      tierId: project.tierId,
      versionId: project.versionId,
    });
  } catch (err) {
    if (err instanceof ScaffoldRootNotFoundError) {
      return jsonError("scaffold_root_missing", err.message, 500);
    }
    if (err instanceof InvalidScaffoldModuleError) {
      return jsonError("invalid_modules", err.message, 400);
    }
    throw err;
  }

  // Mark built so an unchanged re-download is free next time (best-effort).
  markProjectBuilt(project.id, currentHash);

  return new NextResponse(build.stream as any, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${project.slug}.zip"`,
      "Cache-Control": "no-store",
      "X-Credits-Charged": String(charge.charged),
      "X-Idempotent-Replay": charge.alreadyProcessed ? "true" : "false",
    },
  });
}
