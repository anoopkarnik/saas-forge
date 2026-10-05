import { createHash } from "node:crypto";
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
import { buildEnvVarsFromForm } from "@workspace/ui/lib/utils/scaffold";
import { splitSecretEnv } from "@workspace/ui/lib/scaffold-secrets";
import type { FormValues } from "@workspace/ui/lib/zod/download";
import {
  InsufficientCreditsError,
  ScaffoldRootNotFoundError,
  computeBuildHash,
  downloadScaffold,
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

  // Optional JSON body: { expectedTotalCredits } guards against price changes.
  // It is compared with the catalog price; a free re-download never trips it.
  const body = (await req.json().catch(() => ({}))) as { expectedTotalCredits?: unknown };
  const fullPrice = calculateScaffoldCredits(modules).totalCredits;
  if (isPriceChanged(body?.expectedTotalCredits, fullPrice)) {
    return jsonError("price_changed", `This download now costs ${fullPrice} credits.`, 409);
  }

  // Same env files as the web download of this config; saved configs hold no
  // secrets, and splitting guards that.
  const config = (project.config ?? {}) as Record<string, unknown>;
  const { publicEnv } = splitSecretEnv(buildEnvVarsFromForm(config as FormValues));

  let download;
  try {
    download = await downloadScaffold({
      userId: auth.userId,
      source: "api",
      projectId: project.id,
      idempotencyKey: req.headers.get("Idempotency-Key") || undefined,
      free: alreadyBuilt,
      name: project.name,
      projectName: project.slug,
      modules,
      platforms: project.platforms,
      config,
      productTypeId: project.productTypeId,
      tierId: project.tierId,
      versionId: project.versionId,
      envVars: publicEnv,
    });
  } catch (err) {
    if (err instanceof InsufficientCreditsError) {
      return jsonError("insufficient_credits", "Not enough credits.", 403);
    }
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

  return new NextResponse(download.bytes, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${project.slug}.zip"`,
      "Cache-Control": "no-store",
      "X-Credits-Charged": String(download.charged),
      "X-Idempotent-Replay": download.alreadyProcessed ? "true" : "false",
      // Lets clients (the create-saas-forge CLI) verify the archive they saved.
      "X-Content-SHA256": createHash("sha256").update(download.bytes).digest("hex"),
    },
  });
}
