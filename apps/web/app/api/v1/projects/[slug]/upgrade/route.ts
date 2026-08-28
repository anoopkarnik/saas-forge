import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import db from "@workspace/database/client";
import { authenticateApiKey } from "@/server/authenticateApiKey";
import { projectDetailSelect } from "@/lib/scaffold/project-selects";
import {
  InvalidScaffoldModuleError,
  validateSelectedModules,
  type ScaffoldModuleId,
} from "@/lib/scaffold-modules";
import { getTemplateVersion } from "@/lib/scaffold/template-version";
import {
  InsufficientCreditsError,
  ScaffoldRootNotFoundError,
  buildUpgradeKit,
  chargeScaffoldCredits,
  computeBuildHash,
  computeUpgradeDelta,
} from "@/lib/scaffold/service";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ slug: string }> };

const upgradeInput = z.object({
  modules: z.array(z.string()).optional(),
  tierId: z.string().trim().min(1).optional(),
  versionId: z.string().trim().min(1).optional(),
});

function jsonError(code: string, message: string, status: number) {
  return NextResponse.json({ error: { code, message } }, { status });
}

export async function POST(req: NextRequest, ctx: RouteContext) {
  const auth = await authenticateApiKey(req, { scopes: ["scaffold:upgrade"] });
  if (!auth.ok) return auth.response;

  const { slug } = await ctx.params;
  const project = await db.projectConfig.findFirst({
    where: { userId: auth.userId, slug },
    select: projectDetailSelect,
  });
  if (!project) return jsonError("not_found", "Project not found.", 404);

  let body: unknown = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  const parsed = upgradeInput.safeParse(body ?? {});
  if (!parsed.success) {
    return jsonError("invalid_body", parsed.error.message, 400);
  }

  const toTierId = parsed.data.tierId ?? project.tierId;
  const toVersionId = parsed.data.versionId ?? project.versionId;

  let fromModules: ScaffoldModuleId[];
  let toModules: ScaffoldModuleId[];
  try {
    fromModules = validateSelectedModules(project.modules);
    toModules = validateSelectedModules(parsed.data.modules ?? project.modules);
  } catch (err) {
    if (err instanceof InvalidScaffoldModuleError) {
      return jsonError("invalid_modules", err.message, 400);
    }
    throw err;
  }

  const delta = computeUpgradeDelta({
    fromModules,
    toModules,
    fromTierId: project.tierId,
    toTierId,
  });

  if (delta.addedModules.length === 0 && delta.tierSteps === 0) {
    return jsonError(
      "nothing_to_upgrade",
      "Target matches the current configuration.",
      400,
    );
  }

  const idempotencyKey = req.headers.get("Idempotency-Key") || undefined;

  let charge;
  try {
    charge = await chargeScaffoldCredits({
      userId: auth.userId,
      amount: delta.deltaCredits,
      idempotencyKey,
      job: {
        type: "upgrade",
        source: "api",
        projectId: project.id,
        fromModules,
        toModules,
        fromTierId: project.tierId,
        toTierId,
        templateVersion: getTemplateVersion(),
      },
    });
  } catch (err) {
    if (err instanceof InsufficientCreditsError) {
      return jsonError("insufficient_credits", "Not enough credits.", 403);
    }
    throw err;
  }

  let kit;
  try {
    kit = buildUpgradeKit({
      name: project.name,
      projectName: project.slug,
      fromModules,
      toModules,
      fromTierId: project.tierId,
      toTierId,
      versionId: toVersionId,
      platforms: project.platforms,
      config: (project.config ?? {}) as Record<string, unknown>,
      productTypeId: project.productTypeId,
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

  // Apply the upgrade to the saved config so it now reflects the new state.
  const nextTemplateVersion = getTemplateVersion();
  const nextProject = {
    modules: toModules,
    tierId: toTierId,
    versionId: toVersionId,
    platforms: project.platforms,
    templateVersion: nextTemplateVersion,
    config: project.config,
  };
  void db.projectConfig
    .update({
      where: { id: project.id },
      data: {
        modules: toModules,
        tierId: toTierId,
        versionId: toVersionId,
        templateVersion: nextTemplateVersion,
        lastBuiltHash: computeBuildHash(nextProject),
        lastBuiltAt: new Date(),
      },
    })
    .catch(() => {});

  return new NextResponse(kit.stream as any, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${project.slug}-upgrade.zip"`,
      "Cache-Control": "no-store",
      "X-Credits-Charged": String(charge.charged),
      "X-Upgrade-Added-Modules": delta.addedModules.join(",") || "-",
      "X-Idempotent-Replay": charge.alreadyProcessed ? "true" : "false",
    },
  });
}
