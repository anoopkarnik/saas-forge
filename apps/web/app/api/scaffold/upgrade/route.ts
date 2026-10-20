import { getLaunchpadPreferences } from "@/lib/scaffold/launchpad/service";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { guardRoute } from "@/server/routeGuard";
import { getProject, markProjectUpgraded, recordProjectVersion } from "@/lib/scaffold/project-service";
import {
  InvalidScaffoldModuleError,
  isPriceChanged,
  validateSelectedModules,
  type ScaffoldModuleId,
} from "@/lib/scaffold-modules";
import { getTemplateVersion } from "@/lib/scaffold/template-version";
import { track } from "@workspace/analytics/server";
import { getProjectReleases, loadReleases } from "@/lib/scaffold/releases";
import {
  InsufficientCreditsError,
  ScaffoldRootNotFoundError,
  buildUpgradeKitFromBase,
  chargeScaffoldCredits,
  computeBuildHash,
  computeUpgradeDelta,
  resolveProjectUpgradeBase,
  upgradeProviders,
} from "@/lib/scaffold/service";

export const runtime = "nodejs";

// Session-authenticated upgrade for the web UI (the /api/v1 upgrade route is
// API-key authenticated). Excluded from the boilerplate (under /api/scaffold).

const input = z.object({
  slug: z.string().min(1),
  modules: z.array(z.string()).optional(),
  tierId: z.string().trim().min(1).optional(),
  versionId: z.string().trim().min(1).optional(),
  /** The delta the buyer saw; a mismatch is rejected with 409 price_changed. */
  expectedTotalCredits: z.number().int().nonnegative().optional(),
  /** Provider switches, e.g. { payment_gateway: "dodo" }: the kit swaps the code. */
  providers: z.record(z.string(), z.string()).optional(),
});

const RELEASE_KIT_UNAVAILABLE =
  "No snapshot of this project's release was published, so there is no update kit. " +
  "Apply the release notes by hand, then run `create-saas-forge upgrade --mark-current`.";
const RELEASE_KIT_NOT_OWNED =
  "Release kits cover the modules you have downloaded or bought. Download this project (or buy its modules) first.";

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
  let providers: ReturnType<typeof upgradeProviders>;
  try {
    fromModules = validateSelectedModules(project.modules);
    toModules = validateSelectedModules(parsed.data.modules ?? project.modules);
    providers = upgradeProviders(
      (project.config ?? {}) as Record<string, unknown>,
      fromModules,
      toModules,
      parsed.data.providers,
    );
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
  // No module, tier or provider change: a free kit of the releases since the
  // saved version, when that release's snapshot exists.
  const base = await resolveProjectUpgradeBase(session.user.id, fromModules, project.templateVersion);
  const fromBase = base.status === "snapshot" ? base.base : undefined;
  const releaseOnly = delta.addedModules.length === 0 && delta.tierSteps === 0 && providers.switched.length === 0;
  if (releaseOnly && base.status === "missing") {
    return NextResponse.json({ error: RELEASE_KIT_UNAVAILABLE }, { status: 422 });
  }
  if (releaseOnly && base.status === "not_owned") {
    return NextResponse.json({ error: RELEASE_KIT_NOT_OWNED }, { status: 403 });
  }
  if (releaseOnly && base.status !== "snapshot") {
    return NextResponse.json({ error: "Nothing to upgrade" }, { status: 400 });
  }
  if (isPriceChanged(parsed.data.expectedTotalCredits, delta.deltaCredits)) {
    return NextResponse.json(
      { error: "price_changed", totalCredits: delta.deltaCredits },
      { status: 409 },
    );
  }

  const guidePreferences = await getLaunchpadPreferences(session.user.id, { projectId: project.id }, true);
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

  const nextTemplateVersion = getTemplateVersion();
  let kit;
  try {
    kit = buildUpgradeKitFromBase({
      guidePreferences,
      name: project.name,
      projectName: project.slug,
      fromModules,
      toModules,
      fromTierId: project.tierId,
      toTierId,
      versionId: toVersionId,
      platforms: project.platforms,
      config: providers.config,
      productTypeId: project.productTypeId,
      fromProviders: providers.fromProviders,
      toProviders: providers.toProviders,
      fromBase,
      releases: getProjectReleases(project, loadReleases(), nextTemplateVersion).releases,
    }, { releaseOnly });
  } catch (err) {
    if (err instanceof ScaffoldRootNotFoundError) {
      return NextResponse.json({ error: err.message }, { status: 500 });
    }
    if (err instanceof InvalidScaffoldModuleError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    throw err;
  }

  const headers = {
    "Content-Type": "application/zip",
    "Content-Disposition": `attachment; filename="${project.slug}-upgrade.zip"`,
    "Cache-Control": "no-store",
    "X-Upgrade-Kind": releaseOnly ? "release" : "upgrade",
  };
  if (releaseOnly) {
    void recordProjectVersion(project, nextTemplateVersion).catch(() => {});
    return new NextResponse(kit.stream as any, { headers });
  }

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
      config: providers.config,
    }),
    config: providers.config,
  });
  await track(
    "upgrade.purchased",
    { source: "web", addedModules: delta.addedModules, tierSteps: delta.tierSteps, deltaCredits: delta.deltaCredits },
    { distinctId: session.user.id, headers: req.headers },
  );

  return new NextResponse(kit.stream as any, { headers });
}
