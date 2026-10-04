import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { resolveRoutePolicy } from "@/lib/route-policy";

const apiDir = path.resolve(__dirname, "../../app/api");

function listRouteFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return listRouteFiles(full);
    return entry.name === "route.ts" ? [full] : [];
  });
}

const routes = listRouteFiles(apiDir).map((file) => {
  const routePath =
    "/api/" +
    path.relative(apiDir, path.dirname(file)).split(path.sep).join("/");
  return {
    file,
    routePath,
    // Concrete URL for matching: [param] / [...all] segments become "x".
    samplePath: routePath.replace(/\[[^\]]+\]/g, "x"),
    source: fs.readFileSync(file, "utf-8"),
  };
});

const inputMarkers = {
  zod: "safeParse(",
  "image-upload": "normalizeImageUpload(",
  "form-data": "formData(",
} as const;

describe("route trust contract", () => {
  it("finds the API routes on disk", () => {
    expect(routes.length).toBeGreaterThan(0);
  });

  it.each(routes)("$routePath has a policy entry", ({ samplePath }) => {
    expect(resolveRoutePolicy(samplePath)).toBeDefined();
  });

  it.each(routes)(
    "$routePath enforces its session policy through guardRoute",
    ({ samplePath, source }) => {
      const policy = resolveRoutePolicy(samplePath);
      if (policy?.auth !== "session") return;

      expect(source).toContain(`guardRoute(req, "${policy.path}")`);
    },
  );

  it.each(routes)(
    "$routePath validates input the way its policy declares",
    ({ samplePath, source }) => {
      const policy = resolveRoutePolicy(samplePath);
      const marker =
        policy && inputMarkers[policy.input as keyof typeof inputMarkers];
      if (!marker) return;

      expect(source).toContain(marker);
    },
  );

  it("matches on path segments, not raw string prefixes", () => {
    expect(resolveRoutePolicy("/landing")?.auth).toBe("public");
    expect(resolveRoutePolicy("/landing/pricing")?.auth).toBe("public");
    expect(resolveRoutePolicy("/landingx")).toBeUndefined();
    expect(resolveRoutePolicy("/publicity")).toBeUndefined();
    expect(resolveRoutePolicy("/api/v1/projects/abc")?.auth).toBe("api-key");
    expect(resolveRoutePolicy("/api/v1/projects/abc/nope")).toBeUndefined();
  });
});
