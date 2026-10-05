import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { guardRoute } from "@/server/routeGuard";
import { DESKTOP_APP_ORIGIN } from "@workspace/auth/better-auth/desktop-origin";
import {
  calculateScaffoldCredits,
  isPriceChanged,
  InvalidScaffoldModuleError,
  loadScaffoldRegistry,
  validateSelectedModules,
} from "@/lib/scaffold-modules";
import {
  assertNoSecrets,
  buildProjectZip,
  chargeScaffoldCredits,
  formValuesFromEnv,
  InsufficientCreditsError,
  ScaffoldRootNotFoundError,
  SecretNotAcceptedError,
} from "@/lib/scaffold/service";
import { getTemplateVersion } from "@/lib/scaffold/template-version";

const scaffoldAllowedOrigins = [
  DESKTOP_APP_ORIGIN,
  "http://localhost:3000",
  "http://localhost:5173",
  "http://localhost:8081",
  process.env.NEXT_PUBLIC_URL,
].filter(Boolean) as string[];

export const runtime = "nodejs"; // required (streams)

function getRequestOrigin(req: NextRequest) {
  return req.headers.get("origin");
}

function isAllowedScaffoldOrigin(req: NextRequest) {
  const origin = getRequestOrigin(req);
  if (!origin) {
    return false;
  }

  try {
    if (origin === new URL(req.url).origin) {
      return true;
    }
  } catch {
    return false;
  }

  return scaffoldAllowedOrigins.includes(origin);
}

function getCorsHeaders(req: NextRequest) {
  const origin = getRequestOrigin(req);
  const headers: Record<string, string> = {
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    Vary: "Origin",
  };

  if (origin && isAllowedScaffoldOrigin(req)) {
    headers["Access-Control-Allow-Origin"] = origin;
    headers["Access-Control-Allow-Credentials"] = "true";
  }

  return headers;
}

function jsonWithCors(
  req: NextRequest,
  body: Record<string, string | number>,
  status: number,
  extraHeaders?: HeadersInit,
) {
  return NextResponse.json(body, {
    status,
    headers: {
      ...getCorsHeaders(req),
      ...(extraHeaders ?? {}),
    },
  });
}

export async function OPTIONS(req: NextRequest) {
  if (!isAllowedScaffoldOrigin(req)) {
    return jsonWithCors(req, { error: "Forbidden" }, 403);
  }

  return new NextResponse(null, {
    status: 204,
    headers: {
      ...getCorsHeaders(req),
      Allow: "POST, OPTIONS",
    },
  });
}

function sanitizeProjectName(name: string) {
  return (name || "turborepo-app")
    .trim()
    .replace(/[^\w.-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

// POST handler - accepts JSON body with project name and public env vars.
// Secrets are rejected: clients add them to the ZIP on the buyer's device.
export async function POST(req: NextRequest) {
  try {
    if (!isAllowedScaffoldOrigin(req)) {
      return jsonWithCors(req, { error: "Forbidden" }, 403);
    }

    const guard = await guardRoute(req, "/api/scaffold");
    if (!guard.ok) {
      return jsonWithCors(req, { error: guard.error }, guard.status);
    }
    const { session } = guard;

    const body = await req.json();
    const projectName = sanitizeProjectName(body.name ?? "");
    const envVars: Record<string, string> = body.envVars ?? {};
    assertNoSecrets(envVars);

    const registry = loadScaffoldRegistry();
    const modules = validateSelectedModules(body.modules ?? [], registry);
    const pricing = calculateScaffoldCredits(modules, registry);

    if (isPriceChanged(body.expectedTotalCredits, pricing.totalCredits)) {
      return jsonWithCors(req, { error: "price_changed", totalCredits: pricing.totalCredits }, 409);
    }

    if (session.user.creditsTotal - session.user.creditsUsed < pricing.totalCredits) {
      return jsonWithCors(req, { error: "Not enough credits" }, 403);
    }

    // Selected platforms arrive as a public env var (default web-only).
    const platforms = envVars.NEXT_PUBLIC_PLATFORM
      ? envVars.NEXT_PUBLIC_PLATFORM.split(",").map((s) => s.trim())
      : ["web"];

    const build = buildProjectZip({
      name: projectName,
      projectName,
      modules,
      platforms,
      config: formValuesFromEnv(envVars),
      tierId: "custom",
      versionId: "custom",
      envVars,
    });

    // Deduct credits atomically and record the download in the ScaffoldJob ledger.
    try {
      await chargeScaffoldCredits({
        userId: session.user.id,
        amount: pricing.totalCredits,
        job: {
          type: "download",
          source: "web",
          toModules: modules,
          toTierId: "custom",
          templateVersion: getTemplateVersion(),
        },
      });
    } catch (err) {
      build.cleanup();
      throw err;
    }

    revalidatePath("/(home)");

    return new NextResponse(build.stream, {
      headers: {
        ...getCorsHeaders(req),
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${projectName}.zip"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err: any) {
    if (err instanceof SecretNotAcceptedError) {
      return jsonWithCors(req, { error: err.code, keys: err.keys.join(",") }, 400);
    }

    if (err instanceof InsufficientCreditsError) {
      return jsonWithCors(req, { error: "Not enough credits" }, 403);
    }

    if (err instanceof ScaffoldRootNotFoundError) {
      console.error("Scaffold root not found");
      return jsonWithCors(req, { error: "Scaffold root not found" }, 500);
    }

    if (
      err instanceof InvalidScaffoldModuleError ||
      err?.name === "InvalidScaffoldModuleError"
    ) {
      return jsonWithCors(req, { error: err.message }, 400);
    }

    return jsonWithCors(
      req,
      { error: err?.message ?? "Failed to generate zip" },
      500,
    );
  }
}

// GET handler - backward compatible, no env vars
export async function GET(req: NextRequest) {
  return jsonWithCors(req, { error: "Method Not Allowed" }, 405, {
    Allow: "POST, OPTIONS",
  });
}
