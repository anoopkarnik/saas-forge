import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { guardRoute } from "@/server/routeGuard";
import { getProject, markProjectUpgraded } from "@/lib/scaffold/project-service";
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

// Session-authenticated upgrade for the web UI (the /api/v1 upgrade route is
// API-key authenticated). Excluded from the boilerplate (under /api/scaffold).

const input = z.object({
  slug: z.string().min(1),
  modules: z.array(z.string()).optional(),
  tierId: z.string().trim().min(1).optional(),
  versionId: z.string().trim().min(1).optional(),
});

export async function POST(req: NextRequest) {
  const guard = await guardRoute(req, "/api/scaffold/upgrade");
  if (!guard.ok) {
    return NextResponse.json({ error: guard.error }, { status: guard.status });
  }
  const { session } = guard;

  const body = await req.json().catch(() => ({}));
  const parsed = input.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  }

  const project = await getProject(session.user.id, parsed.data.slug);
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
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
      return NextResponse.json({ error: err.message }, { status: 400 });
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
    return NextResponse.json({ error: "Nothing to upgrade" }, { status: 400 });
  }

  try {
    await chargeScaffoldCredits({
      userId: session.user.id,
      amount: delta.deltaCredits,
      job: {
        type: "upgrade",
        source: "web",
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
      return NextResponse.json({ error: "Not enough credits" }, { status: 403 });
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
      return NextResponse.json({ error: err.message }, { status: 500 });
    }
    if (err instanceof InvalidScaffoldModuleError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    throw err;
  }

  const nextTemplateVersion = getTemplateVersion();
  markProjectUpgraded(project.id, {
    modules: toModules,
    tierId: toTierId,
    versionId: toVersionId,
    templateVersion: nextTemplateVersion,
    lastBuiltHash: computeBuildHash({
      modules: toModules,
      tierId: toTierId,
      versionId: toVersionId,
      platforms: project.platforms,
      templateVersion: nextTemplateVersion,
      config: project.config,
    }),
  });

  return new NextResponse(kit.stream as any, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${project.slug}-upgrade.zip"`,
      "Cache-Control": "no-store",
    },
  });
}
