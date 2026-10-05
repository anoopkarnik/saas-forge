// @vitest-environment node
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

// Vercel deploys each route with only the files traced for it. The scaffold
// code reads the registry and the starter with fs, which tracing cannot see,
// so next.config.mjs must include them; this checks it does, the way Next
// matches the keys (picomatch with `contains`).
type TraceMap = Record<string, string[]>;
const require = createRequire(import.meta.url);
const picomatch = require("next/dist/compiled/picomatch") as (
  glob: string,
  options: { dot: boolean; contains: boolean },
) => (value: string) => boolean;

const webRoot = fileURLToPath(new URL("../../..", import.meta.url));
const config = (await import(/* @vite-ignore */ path.join(webRoot, "next.config.mjs"))).default as {
  outputFileTracingIncludes: TraceMap;
  outputFileTracingExcludes: TraceMap;
};

function traced(map: TraceMap, route: string): string[] {
  return Object.entries(map)
    .filter(([glob]) => picomatch(glob, { dot: true, contains: true })(route))
    .flatMap(([, files]) => files);
}

/** API routes as Next names them: /api/v1/projects/[slug]/download. */
function apiRoutes(): Array<{ route: string; source: string }> {
  const routes: Array<{ route: string; source: string }> = [];
  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name === "route.ts") {
        const route = "/" + path.relative(path.join(webRoot, "app"), dir).split(path.sep).join("/");
        routes.push({ route, source: fs.readFileSync(full, "utf-8") });
      }
    }
  };
  walk(path.join(webRoot, "app/api"));
  return routes;
}

const STARTER = "../../templates/saas-boilerplate/apps/**/*";
const readsStarter = (source: string) => /@\/lib\/scaffold\/(service|build-cache)"/.test(source);

describe("output file tracing", () => {
  it("ships the module registry with every route", () => {
    for (const { route } of apiRoutes()) {
      expect(traced(config.outputFileTracingIncludes, route), route).toContain("../../scaffold-modules/**/*");
    }
  });

  it("ships the starter source with every route that builds from it", () => {
    const builders = apiRoutes().filter(({ source }) => readsStarter(source));
    expect(builders.map(({ route }) => route)).toEqual(
      expect.arrayContaining(["/api/scaffold", "/api/v1/projects/[slug]/download"]),
    );
    for (const { route } of builders) {
      expect(traced(config.outputFileTracingIncludes, route), route).toContain(STARTER);
    }
    expect(traced(config.outputFileTracingIncludes, "/api/scaffold/trpc/[trpc]")).toContain(STARTER);
  });

  it("keeps the starter out of the main tRPC function", () => {
    expect(traced(config.outputFileTracingIncludes, "/api/trpc/[trpc]")).not.toContain(STARTER);
    expect(traced(config.outputFileTracingExcludes, "/api/trpc/[trpc]")).toContain("../../templates/**");
  });
});
