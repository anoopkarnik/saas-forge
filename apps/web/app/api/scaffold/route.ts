import { NextRequest, NextResponse } from "next/server";
import archiver from "archiver";
import path from "path";
import fs from "fs";

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

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const projectName = sanitizeProjectName(searchParams.get("name") ?? "");

    // In a typical turborepo dev setup, process.cwd() is repo root when running `pnpm dev` from root.
    // If you run Next dev from apps/web, then cwd becomes apps/web.
    // So we detect root by looking for pnpm-workspace.yaml / turbo.json.
    const cwd = process.cwd();
    const repoRootCandidates = [
      cwd,
      path.resolve(cwd, "../.."), // if route runs with cwd=apps/web, go up to repo root
      path.resolve(cwd, ".."),
    ];

    const repoRoot =
      repoRootCandidates.find((p) =>
        fs.existsSync(path.join(p, "pnpm-workspace.yaml")) ||
        fs.existsSync(path.join(p, "turbo.json"))
      ) ?? cwd;

    if (!fs.existsSync(repoRoot)) {
      return NextResponse.json({ error: "Repo root not found" }, { status: 500 });
    }

    const archive = archiver("zip", { zlib: { level: 9 } });

    // Convert Node archiver stream -> Web ReadableStream for NextResponse
    const stream = new ReadableStream({
      start(controller) {
        archive.on("data", (chunk:any) => controller.enqueue(chunk));
        archive.on("end", () => controller.close());
        archive.on("error", (err:any) => controller.error(err));
      },
      cancel() {
        archive.abort();
      },
    });

    // Zip the entire repo root under a top-level folder = projectName
    archive.directory(repoRoot, projectName, (entry:any) => {
      // entry.name is the path inside the zip, like:
      //   <projectName>/apps/web/...
      const insideZip = entry.name;
      const relInsideProject = insideZip.replace(`${projectName}/`, "");

      if (shouldIgnore(relInsideProject)) return false;
      return entry;
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
