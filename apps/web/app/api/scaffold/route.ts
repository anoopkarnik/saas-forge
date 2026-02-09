import { NextRequest, NextResponse } from "next/server";
import archiver from "archiver";
import path from "path";
import fs from "fs";
import { auth } from "@workspace/auth/better-auth/auth";
import { headers } from "next/headers";
import db from "@workspace/database/client"
import { revalidatePath } from "next/cache";

export const CREDITS_COST = 20;


export const runtime = "nodejs"; // required (streams)

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

function getRepoRoot(): string {
  // In a typical turborepo dev setup, process.cwd() is repo root when running `pnpm dev` from root.
  // If you run Next dev from apps/web, then cwd becomes apps/web.
  // So we detect root by looking for pnpm-workspace.yaml / turbo.json.
  const cwd = process.cwd();
  const repoRootCandidates = [
    cwd,
    path.resolve(cwd, "../.."), // if route runs with cwd=apps/web, go up to repo root
    path.resolve(cwd, ".."),
  ];

  return (
    repoRootCandidates.find(
      (p) =>
        fs.existsSync(path.join(p, "pnpm-workspace.yaml")) ||
        fs.existsSync(path.join(p, "turbo.json"))
    ) ?? cwd
  );
}

function generateEnvContent(
  envExamplePath: string,
  envVars: Record<string, string>
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
  envVars: Record<string, string>
) {
  const archive = archiver("zip", { zlib: { level: 9 } });

  // Zip the entire repo root under a top-level folder = projectName
  archive.directory(repoRoot, projectName, (entry: any) => {
    // entry.name is the path inside the zip, like:
    //   <projectName>/apps/web/...
    const insideZip = entry.name;
    const relInsideProject = insideZip.replace(`${projectName}/`, "");

    if (shouldIgnore(relInsideProject)) return false;
    return entry;
  });

  // Add .env file with user-provided values under apps/web/
  if (envContent) {
    archive.append(envContent, { name: `${projectName}/apps/web/.env` });
  }

  // Add .env file for packages/database/ with DATABASE_URL
  if (envVars.DATABASE_URL) {
    const databaseEnvContent = `DATABASE_URL="${envVars.DATABASE_URL}"`;
    archive.append(databaseEnvContent, { name: `${projectName}/packages/database/.env` });
  }

  return archive;
}

// POST handler - accepts JSON body with project name and env vars
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const projectName = sanitizeProjectName(body.name ?? "");
    const envVars: Record<string, string> = body.envVars ?? {};

    const repoRoot = getRepoRoot();
    const scaffoldRoot = path.join(repoRoot, "templates/saas-boilerplate");

    if (!fs.existsSync(scaffoldRoot)) {
      console.error(`Scaffold root not found at: ${scaffoldRoot}`);
      return NextResponse.json(
        { error: "Scaffold root not found" },
        { status: 500 }
      );
    }

    // Generate .env content from .env.example with user-provided values
    const envExamplePath = path.join(scaffoldRoot, "apps/web/.env.example");
    const envContent = generateEnvContent(envExamplePath, envVars);

    const archive = createZipStream(scaffoldRoot, projectName, envContent, envVars);

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

    return new NextResponse(stream as any, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${projectName}.zip"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Failed to generate zip" },
      { status: 500 }
    );
  }
}

// GET handler - backward compatible, no env vars
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const session = await auth.api.getSession({
      headers: await headers(), // pass the headers
    });

    if ((session?.user?.creditsTotal - session?.user?.creditsUsed) < CREDITS_COST) {
      return NextResponse.json(
        { error: "Not enough credits" },
        { status: 403 }
      );
    }
    const projectName = sanitizeProjectName(searchParams.get("name") ?? "");

    const repoRoot = getRepoRoot();
    const scaffoldRoot = path.join(repoRoot, "templates/saas-boilerplate");

    if (!fs.existsSync(scaffoldRoot)) {
      console.error(`Scaffold root not found at: ${scaffoldRoot}`);
      return NextResponse.json(
        { error: "Scaffold root not found" },
        { status: 500 }
      );
    }

    const archive = createZipStream(scaffoldRoot, projectName, null, {});

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

    await db.user.update({
      where: { id: session.user.id },
      data: { creditsUsed: session.user.creditsUsed + CREDITS_COST },
    });

    revalidatePath("/(home)");

    return new NextResponse(stream as any, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${projectName}.zip"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Failed to generate zip" },
      { status: 500 }
    );
  }
}
