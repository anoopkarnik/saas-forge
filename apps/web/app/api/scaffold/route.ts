import { NextRequest, NextResponse } from "next/server";
import archiver from "archiver";
import path from "path";
import fs from "fs";
import { auth } from "@workspace/auth/better-auth/auth";
import { headers } from "next/headers";
import db from "@workspace/database/client";
import { revalidatePath } from "next/cache";
import { ratelimit } from "@/server/ratelimit";

const CREDITS_COST = 20;
const scaffoldRoots = process.env.VERCEL
  ? ["templates/saas-boilerplate", ".generated/saas-boilerplate"]
  : [".generated/saas-boilerplate", "templates/saas-boilerplate"];
const scaffoldAllowedOrigins = [
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
  body: Record<string, string>,
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

function shouldIgnore(relPath: string) {
  const parts = relPath.split(path.sep);

  // Ignore heavy/build/secret-ish dirs
  const ignoreDirs = new Set([
    "node_modules",
    ".git",
    ".next",
    "dist",
    "build",
    "out",
    ".turbo",
    ".vercel",
    ".cache",
    "coverage",
    "scaffold",
    "pnpm-lock.yaml",
  ]);

  // Ignore common OS junk
  const ignoreFiles = new Set([".DS_Store", "Thumbs.db"]);

  if (parts.some((p) => ignoreDirs.has(p))) return true;
  if (ignoreFiles.has(path.basename(relPath))) return true;

  // OPTIONAL: prevent shipping real env files
  // Keep only .env.example in repo template if possible.
  if (path.basename(relPath) === ".env") return true;

  return false;
}

function getScaffoldRoot(): string {
  const cwd = process.cwd();
  const scaffoldCandidates = scaffoldRoots.flatMap((root) => [
    path.join(cwd, root),
    path.join(cwd, "../../", root),
    path.join(cwd, "../", root),
  ]);

  const found = scaffoldCandidates.find((p) => fs.existsSync(p));

  if (found) {
    return found;
  }

  return path.join(cwd, "../../", scaffoldRoots[0]!);
}

function generateEnvContent(
  envExamplePath: string,
  envVars: Record<string, string>,
): string {
  if (!fs.existsSync(envExamplePath)) {
    // If no .env.example exists, just create from provided vars
    return Object.entries(envVars)
      .map(([key, value]) => `${key}=${value}`)
      .join("\n");
  }

  const envExampleContent = fs.readFileSync(envExamplePath, "utf-8");
  const lines = envExampleContent.split("\n");

  return lines
    .map((line) => {
      // Skip comments and empty lines
      if (line.startsWith("#") || line.trim() === "") {
        return line;
      }

      // Parse the key from the line (format: KEY= or KEY=value)
      const match = line.match(/^([A-Z_][A-Z0-9_]*)=/);
      if (match) {
        const key = match[1];
        if (key && key in envVars) {
          return `${key}=${envVars[key]}`;
        }
      }

      return line;
    })
    .join("\n");
}

function createZipStream(
  repoRoot: string,
  projectName: string,
  envContent: string | null,
  mobileEnvContent: string | null,
  desktopEnvContent: string | null,
  envVars: Record<string, string>,
  platforms: string[] = ["web"],
) {
  const archive = archiver("zip", { zlib: { level: 9 } });

  // Zip the entire repo root under a top-level folder = projectName
  archive.directory(repoRoot, projectName, (entry: any) => {
    // entry.name is the path inside the zip, like:
    //   <projectName>/apps/web/...
    const insideZip = entry.name;
    const relInsideProject = insideZip.replace(`${projectName}/`, "");

    if (shouldIgnore(relInsideProject)) return false;

    // Exclude unselected platform apps
    if (
      !platforms.includes("mobile") &&
      relInsideProject.startsWith("apps/mobile/")
    )
      return false;
    if (
      !platforms.includes("desktop") &&
      relInsideProject.startsWith("apps/desktop/")
    )
      return false;

    return entry;
  });

  // Add .env file with user-provided values under apps/web/
  if (envContent) {
    archive.append(envContent, { name: `${projectName}/apps/web/.env` });
  }

  // Add .env file for apps/mobile/
  if (platforms.includes("mobile") && mobileEnvContent) {
    archive.append(mobileEnvContent, {
      name: `${projectName}/apps/mobile/.env`,
    });
  }

  // Add .env file for apps/desktop/
  if (platforms.includes("desktop") && desktopEnvContent) {
    archive.append(desktopEnvContent, {
      name: `${projectName}/apps/desktop/.env`,
    });
  }

  // Add .env file for packages/database/ with DATABASE_URL
  if (envVars.DATABASE_URL) {
    const databaseEnvContent = `DATABASE_URL="${envVars.DATABASE_URL}"`;
    archive.append(databaseEnvContent, {
      name: `${projectName}/packages/database/.env`,
    });
  }

  // Add .boilerplate-version for upgrade workflow (read from manifest at repo root)
  const manifestCandidates = [
    path.join(repoRoot, "../../template-sync.manifest.json"),
    path.join(repoRoot, "../template-sync.manifest.json"),
    path.join(repoRoot, "template-sync.manifest.json"),
  ];
  const manifestFile = manifestCandidates.find((p) => fs.existsSync(p));
  if (manifestFile) {
    try {
      const manifest = JSON.parse(fs.readFileSync(manifestFile, "utf-8"));
      if (manifest.templateVersion) {
        archive.append(manifest.templateVersion + "\n", {
          name: `${projectName}/.boilerplate-version`,
        });
      }
    } catch {
      // Non-critical — skip version injection if manifest is unreadable
    }
  }

  return archive;
}

// POST handler - accepts JSON body with project name and env vars
export async function POST(req: NextRequest) {
  try {
    if (!isAllowedScaffoldOrigin(req)) {
      return jsonWithCors(req, { error: "Forbidden" }, 403);
    }

    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return jsonWithCors(req, { error: "Unauthorized" }, 401);
    }

    const { success } = await ratelimit.limit(session.user.id);
    if (!success) {
      return jsonWithCors(req, { error: "Rate limit exceeded" }, 429);
    }

    if (session.user.creditsTotal - session.user.creditsUsed < CREDITS_COST) {
      return jsonWithCors(req, { error: "Not enough credits" }, 403);
    }

    const body = await req.json();
    const projectName = sanitizeProjectName(body.name ?? "");
    const envVars: Record<string, string> = body.envVars ?? {};
    const scaffoldRoot = getScaffoldRoot();

    if (!fs.existsSync(scaffoldRoot)) {
      console.error(`Scaffold root not found at: ${scaffoldRoot}`);
      return jsonWithCors(req, { error: "Scaffold root not found" }, 500);
    }

    // Parse selected platforms from env vars (default to web-only)
    const platforms = envVars.NEXT_PUBLIC_PLATFORM
      ? envVars.NEXT_PUBLIC_PLATFORM.split(",").map((s) => s.trim())
      : ["web"];

    // Generate .env content from .env.example with user-provided values
    const envExamplePath = path.join(scaffoldRoot, "apps/web/.env.example");
    const envContent = generateEnvContent(envExamplePath, envVars);

    // Helpers to map web env vars to mobile/desktop
    const support = envVars.NEXT_PUBLIC_SUPPORT_FEATURES
      ? envVars.NEXT_PUBLIC_SUPPORT_FEATURES.split(",").map((s) => s.trim())
      : [];

    // Generate .env content for mobile and desktop
    const mobileEnvExamplePath = path.join(
      scaffoldRoot,
      "apps/mobile/.env.example",
    );
    const desktopEnvExamplePath = path.join(
      scaffoldRoot,
      "apps/desktop/.env.example",
    );

    const mobileEnvVars: Record<string, string> = {
      EXPO_PUBLIC_API_URL: envVars.NEXT_PUBLIC_URL || "http://localhost:3000",
      EXPO_PUBLIC_APP_URL: "http://localhost:8081",
      EXPO_PUBLIC_AUTH_EMAIL:
        envVars.NEXT_PUBLIC_AUTH_EMAIL === "true" ? "true" : "false",
      EXPO_PUBLIC_AUTH_GOOGLE:
        envVars.NEXT_PUBLIC_AUTH_GOOGLE === "true" ? "true" : "false",
      EXPO_PUBLIC_AUTH_GITHUB:
        envVars.NEXT_PUBLIC_AUTH_GITHUB === "true" ? "true" : "false",
      EXPO_PUBLIC_AUTH_LINKEDIN:
        envVars.NEXT_PUBLIC_AUTH_LINKEDIN === "true" ? "true" : "false",
      EXPO_PUBLIC_SUPPORT_MAIL: support.includes("support_mail")
        ? "true"
        : "false",
      EXPO_PUBLIC_THEME: envVars.NEXT_PUBLIC_THEME || "green",
      EXPO_PUBLIC_THEME_TYPE: envVars.NEXT_PUBLIC_THEME_TYPE || "light",
      EXPO_PUBLIC_PAYMENT_GATEWAY:
        envVars.NEXT_PUBLIC_PAYMENT_GATEWAY || "dodo",
      EXPO_PUBLIC_CALENDLY_BOOKING_URL:
        envVars.NEXT_PUBLIC_CALENDLY_BOOKING_URL || '""',
    };

    const desktopEnvVars: Record<string, string> = {
      VITE_API_URL: envVars.NEXT_PUBLIC_URL
        ? `"${envVars.NEXT_PUBLIC_URL}"`
        : '"http://localhost:3000"',
      NEXT_PUBLIC_AUTH_FRAMEWORK: envVars.NEXT_PUBLIC_AUTH_FRAMEWORK
        ? `"${envVars.NEXT_PUBLIC_AUTH_FRAMEWORK}"`
        : '"better-auth"',
      VITE_AUTH_EMAIL:
        envVars.NEXT_PUBLIC_AUTH_EMAIL === "true" ? "true" : "false",
      VITE_AUTH_GOOGLE:
        envVars.NEXT_PUBLIC_AUTH_GOOGLE === "true" ? "true" : "false",
      VITE_AUTH_GITHUB:
        envVars.NEXT_PUBLIC_AUTH_GITHUB === "true" ? "true" : "false",
      VITE_AUTH_LINKEDIN:
        envVars.NEXT_PUBLIC_AUTH_LINKEDIN === "true" ? "true" : "false",
      VITE_PAYMENT_GATEWAY: envVars.NEXT_PUBLIC_PAYMENT_GATEWAY
        ? `"${envVars.NEXT_PUBLIC_PAYMENT_GATEWAY}"`
        : '"dodo"',
      VITE_SUPPORT_MAIL:
        support.includes("support_mail") && envVars.NEXT_PUBLIC_SUPPORT_MAIL
          ? `"${envVars.NEXT_PUBLIC_SUPPORT_MAIL}"`
          : '""',
      VITE_CALENDLY_BOOKING_URL:
        support.includes("calendly") && envVars.NEXT_PUBLIC_CALENDLY_BOOKING_URL
          ? `"${envVars.NEXT_PUBLIC_CALENDLY_BOOKING_URL}"`
          : '""',
    };

    const mobileEnvContent = fs.existsSync(mobileEnvExamplePath)
      ? generateEnvContent(mobileEnvExamplePath, mobileEnvVars)
      : null;

    const desktopEnvContent = fs.existsSync(desktopEnvExamplePath)
      ? generateEnvContent(desktopEnvExamplePath, desktopEnvVars)
      : null;

    const archive = createZipStream(
      scaffoldRoot,
      projectName,
      envContent,
      mobileEnvContent,
      desktopEnvContent,
      envVars,
      platforms,
    );

    // Convert Node archiver stream -> Web ReadableStream for NextResponse
    const stream = new ReadableStream({
      start(controller) {
        archive.on("data", (chunk: any) => controller.enqueue(chunk));
        archive.on("end", () => controller.close());
        archive.on("error", (err: any) => controller.error(err));
      },
      cancel() {
        archive.abort();
      },
    });

    await archive.finalize();

    // Deduct credits
    await db.user.update({
      where: { id: session.user.id },
      data: { creditsUsed: session.user.creditsUsed + CREDITS_COST },
    });

    revalidatePath("/(home)");

    return new NextResponse(stream as any, {
      headers: {
        ...getCorsHeaders(req),
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${projectName}.zip"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err: any) {
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
