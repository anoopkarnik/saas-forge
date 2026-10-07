// @vitest-environment node
import { createHash } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { compileSpy } = vi.hoisted(() => ({ compileSpy: vi.fn() }));
vi.mock("@/lib/scaffold-modules", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/scaffold-modules")>();
  return {
    ...actual,
    compileScaffoldVariant: (...args: Parameters<typeof actual.compileScaffoldVariant>) => {
      compileSpy(...args);
      return actual.compileScaffoldVariant(...args);
    },
  };
});

import { resolveWorkspacePath } from "@/lib/scaffold-modules";
import {
  BUILDER_VERSION,
  computeBuildKey,
  getOrBuildBaseArchive,
  templateFingerprint,
  type BuildCacheStore,
} from "@/lib/scaffold/build-cache";

function memoryStore(): BuildCacheStore & { objects: Map<string, Uint8Array<ArrayBuffer>> } {
  const objects = new Map<string, Uint8Array<ArrayBuffer>>();
  return {
    objects,
    async get(key) {
      return objects.get(key) ?? null;
    },
    async put(key, bytes) {
      objects.set(key, new Uint8Array(bytes));
    },
  };
}

const scaffoldRoot = resolveWorkspacePath("templates/saas-boilerplate");

beforeEach(() => compileSpy.mockClear());

describe("computeBuildKey", () => {
  it("ignores selection order and changes with the starter", () => {
    const a = computeBuildKey({ templateFingerprint: "t1", modules: ["ai", "billing"], platforms: ["web", "mobile"] });
    const b = computeBuildKey({ templateFingerprint: "t1", modules: ["billing", "ai"], platforms: ["mobile", "web"] });
    const c = computeBuildKey({ templateFingerprint: "t2", modules: ["ai", "billing"], platforms: ["web", "mobile"] });
    expect(a).toBe(b);
    expect(a).not.toBe(c);
  });
});

describe("templateFingerprint", () => {
  it("changes when a starter file changes, without a version bump", () => {
    const make = (content: string) => {
      const dir = fs.mkdtempSync(path.join(os.tmpdir(), "fingerprint-"));
      fs.writeFileSync(path.join(dir, "page.tsx"), content);
      fs.mkdirSync(path.join(dir, "node_modules"));
      fs.writeFileSync(path.join(dir, "node_modules/ignored.js"), String(Math.random()));
      return dir;
    };
    const [one, same, changed] = [make("a"), make("a"), make("b")];
    expect(templateFingerprint(one)).toBe(templateFingerprint(same));
    expect(templateFingerprint(one)).not.toBe(templateFingerprint(changed));
  });
});

describe("getOrBuildBaseArchive", () => {
  it("builds and caches on a miss, then serves the cache without compiling", async () => {
    const store = memoryStore();
    const first = await getOrBuildBaseArchive({ scaffoldRoot, modules: [], platforms: ["web"], store });
    expect(first.cacheHit).toBe(false);
    expect(compileSpy).toHaveBeenCalledTimes(1);
    expect(store.objects.size).toBe(2);
    expect(first.manifest.envExamples["apps/web/.env.example"]).toContain("NEXT_PUBLIC_URL");
    expect(first.manifest.files.some((file) => file.path === "pnpm-lock.yaml")).toBe(true);

    const second = await getOrBuildBaseArchive({ scaffoldRoot, modules: [], platforms: ["web"], store });
    expect(second.cacheHit).toBe(true);
    expect(compileSpy).toHaveBeenCalledTimes(1);
    expect(Buffer.from(second.bytes).equals(Buffer.from(first.bytes))).toBe(true);
  }, 60_000);

  it("serves an owner's earlier build while it is still cached", async () => {
    const store = memoryStore();
    const zip = new Uint8Array([1, 2, 3]);
    await store.put("old-key.zip", zip, "application/zip");
    await store.put(
      "old-key.manifest.json",
      new TextEncoder().encode(JSON.stringify({ buildKey: "old-key", files: [], envExamples: {} })),
      "application/json",
    );
    const result = await getOrBuildBaseArchive({
      scaffoldRoot,
      modules: [],
      platforms: ["web"],
      preferredBuildKey: "old-key",
      store,
    });
    expect(result).toMatchObject({ cacheHit: true, manifest: { buildKey: "old-key" } });
    expect(compileSpy).not.toHaveBeenCalled();
  });

  it("still builds when the cache is unreachable", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const broken: BuildCacheStore = {
      get: async () => {
        throw new Error("R2 down");
      },
      put: async () => {
        throw new Error("R2 down");
      },
    };
    const result = await getOrBuildBaseArchive({ scaffoldRoot, modules: [], platforms: ["web"], store: broken });
    expect(result.cacheHit).toBe(false);
    expect(result.bytes.length).toBeGreaterThan(0);
    warn.mockRestore();
  }, 60_000);
});

// Cached archives outlive deploys, so a builder change must change the key.
describe("BUILDER_VERSION", () => {
  it("is bumped whenever the builder sources change", () => {
    const sources = ["apps/web/lib/scaffold-modules.ts", "apps/web/lib/scaffold/build-cache.ts"]
      .map((file) => fs.readFileSync(resolveWorkspacePath(file), "utf-8").replace(/BUILDER_VERSION = \d+/, ""))
      .join("\0");
    const hash = createHash("sha256").update(sources).digest("hex").slice(0, 16);
    expect(
      { version: BUILDER_VERSION, hash },
      "Builder sources changed: if archive output changes, bump BUILDER_VERSION; then record the new hash here.",
    ).toEqual({ version: 6, hash: "53212985c6d47b6b" });
  });
});
