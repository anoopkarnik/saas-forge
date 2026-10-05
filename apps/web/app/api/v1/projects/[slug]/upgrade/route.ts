import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { authenticateApiKey } from "@/server/authenticateApiKey";
import { getProject, markProjectUpgraded } from "@/lib/scaffold/project-service";
import {
  InvalidScaffoldModuleError,
  isPriceChanged,
  validateSelectedModules,
  type ScaffoldModuleId,
} from "@/lib/scaffold-modules";
import { getTemplateVersion } from "@/lib/scaffold/template-version";
import { getProjectReleases, loadReleases } from "@/lib/scaffold/releases";
import {
  InsufficientCreditsError,
  ScaffoldRootNotFoundError,
  buildUpgradeKit,
  chargeScaffoldCredits,
  computeBuildHash,
  computeUpgradeDelta,
  upgradeProviders,
  previewUpgrade,
} from "@/lib/scaffold/service";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ slug: string }> };

const upgradeInput = z.object({
  modules: z.array(z.string()).optional(),
  tierId: z.string().trim().min(1).optional(),
  versionId: z.string().trim().min(1).optional(),
  /** The delta the buyer saw; a mismatch is rejected with 409 price_changed. */
  expectedTotalCredits: z.number().int().nonnegative().optional(),
  /** Provider switches, e.g. { payment_gateway: "dodo" }: the kit swaps the code. */
  providers: z.record(z.string(), z.string()).optional(),
});

function jsonError(code: string, message: string, status: number) {
  return NextResponse.json({ error: { code, message } }, { status });
}

/**
 * The upgrade without buying it (`create-saas-forge upgrade --dry-run`): the
 * kit's file counts and price, plus the release notes since the project's
 * version. `?modules=a,b&tierId=tier-3` set the target.
 */
export async function GET(req: NextRequest, ctx: RouteContext) {
  const auth = await authenticateApiKey(req, { scopes: ["read:projects"] });
  if (!auth.ok) return auth.response;

  const { slug } = await ctx.params;
  const project = await getProject(auth.userId, slug);
  if (!project) return jsonError("not_found", "Project not found.", 404);

  const params = req.nextUrl.searchParams;
  const modules = params.get("modules")?.split(",").map((id) => id.trim()).filter(Boolean);
  // ?providers=payment_gateway:dodo,cms:postgres
  const switches = Object.fromEntries(
    (params.get("providers") ?? "").split(",").filter(Boolean).map((pair) => pair.split(":").map((part) => part.trim())),
  ) as Record<string, string>;
  try {
    const toModules = modules ?? project.modules;
    const providers = upgradeProviders((project.config ?? {}) as Record<string, unknown>, project.modules, toModules, switches);
    const preview = previewUpgrade({
      fromModules: project.modules,
      toModules,
      fromTierId: project.tierId,
      toTierId: params.get("tierId") || project.tierId,
      platforms: project.platforms,
      fromProviders: providers.fromProviders,
      toProviders: providers.toProviders,
    });
    const releases = getProjectReleases(project, loadReleases(), getTemplateVersion());
    return NextResponse.json({ preview, releases });
  } catch (err) {
    if (err instanceof InvalidScaffoldModuleError) {
      return jsonError("invalid_modules", err.message, 400);
    }
    if (err instanceof ScaffoldRootNotFoundError) {
      return jsonError("scaffold_root_missing", err.message, 500);
    }
    throw err;
  }
}

export async function POST(req: NextRequest, ctx: RouteContext) {
  const auth = await authenticateApiKey(req, { scopes: ["scaffold:upgrade"] });
  if (!auth.ok) return auth.response;

  const { slug } = await ctx.params;
  const project = await getProject(auth.userId, slug);
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

  if (delta.addedModules.length === 0 && delta.tierSteps === 0 && providers.switched.length === 0) {
    return jsonError(
      "nothing_to_upgrade",
      "Target matches the current configuration.",
      400,
    );
  }
  if (isPriceChanged(parsed.data.expectedTotalCredits, delta.deltaCredits)) {
    return jsonError(
      "price_changed",
      `The upgrade now costs ${delta.deltaCredits} credits.`,
      409,
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
      config: providers.config,
      productTypeId: project.productTypeId,
      fromProviders: providers.fromProviders,
      toProviders: providers.toProviders,
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
    config: providers.config,
  };
  markProjectUpgraded(project.id, {
    modules: toModules,
    tierId: toTierId,
    versionId: toVersionId,
    templateVersion: nextTemplateVersion,
    lastBuiltHash: computeBuildHash(nextProject),
    config: providers.config,
  });

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
