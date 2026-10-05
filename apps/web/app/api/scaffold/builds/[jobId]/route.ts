import { NextRequest, NextResponse } from "next/server";
import { guardRoute } from "@/server/routeGuard";
import type { ScaffoldModuleId } from "@/lib/scaffold-modules";
import {
  downloadScaffold,
  formValuesFromEnv,
  getOwnedBuild,
  ScaffoldRootNotFoundError,
} from "@/lib/scaffold/service";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ jobId: string }> };

// Free re-download of a build the caller already received ("My downloads").
// Secrets were never stored, so the archive carries public values only.
export async function POST(req: NextRequest, ctx: RouteContext) {
  const guard = await guardRoute(req, "/api/scaffold/builds/[jobId]");
  if (!guard.ok) {
    return NextResponse.json({ error: guard.error }, { status: guard.status });
  }

  const { jobId } = await ctx.params;
  const job = await getOwnedBuild(guard.session.user.id, jobId);
  if (!job) {
    return NextResponse.json({ error: "Download not found" }, { status: 404 });
  }

  const envVars = (job.envVars ?? {}) as Record<string, string>;
  const projectName = job.projectName ?? "saas-forge-app";
  try {
    const download = await downloadScaffold({
      userId: guard.session.user.id,
      source: "web",
      projectId: job.projectId,
      free: true,
      name: projectName,
      projectName,
      modules: job.toModules as ScaffoldModuleId[],
      platforms: job.platforms,
      config: formValuesFromEnv(envVars),
      tierId: job.toTierId,
      versionId: "custom",
      envVars,
      preferredBuildKey: job.buildKey,
    });
    return new NextResponse(download.bytes, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${projectName}.zip"`,
        "Cache-Control": "no-store",
        "X-Credits-Charged": "0",
      },
    });
  } catch (err) {
    if (err instanceof ScaffoldRootNotFoundError) {
      return NextResponse.json({ error: "Scaffold root not found" }, { status: 500 });
    }
    throw err;
  }
}
