// @vitest-environment node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, describe, expect, it, vi } from "vitest";
import {
  getReleaseSnapshotStore,
  loadReleaseSnapshot,
  packReleaseSnapshot,
  unpackReleaseSnapshot,
  type SnapshotStore,
} from "@/lib/scaffold/release-snapshots";

const temps: string[] = [];
const tempDir = (prefix = "release-snapshot-test-") => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  temps.push(dir);
  return dir;
};
afterAll(() => temps.forEach((dir) => fs.rmSync(dir, { recursive: true, force: true })));

function write(root: string, rel: string, content: string) {
  fs.mkdirSync(path.dirname(path.join(root, rel)), { recursive: true });
  fs.writeFileSync(path.join(root, rel), content);
}

function fixture() {
  const starterRoot = tempDir();
  write(starterRoot, "apps/web/lib/utils.ts", "export const a = 1;\n");
  write(starterRoot, "apps/web/.env.example", "A=\n");
  write(starterRoot, "apps/web/.env", "SECRET=1\n");
  write(starterRoot, "node_modules/pkg/index.js", "x");
  write(starterRoot, "apps/web/.next/cache.txt", "x");
  const rulesRoot = tempDir();
  write(rulesRoot, "scaffold-modules/registry.json", '{"modules":[]}');
  write(rulesRoot, "scaffold-providers/registry.json", '{"providers":[]}');
  write(rulesRoot, "unrelated/file.txt", "x");
  return { starterRoot, rulesRoot };
}

function fakeStore(bytes: Uint8Array | null): SnapshotStore & { get: ReturnType<typeof vi.fn> } {
  return { get: vi.fn(async () => bytes), put: vi.fn(async () => {}) };
}

describe("release snapshots", () => {
  it("round-trips the starter and its rules, without local env files or build output", async () => {
    const bytes = await packReleaseSnapshot(fixture());
    const out = tempDir();
    const { starterRoot, rulesRoot } = await unpackReleaseSnapshot(bytes, out);

    expect(fs.readFileSync(path.join(starterRoot, "apps/web/lib/utils.ts"), "utf-8")).toBe("export const a = 1;\n");
    expect(fs.existsSync(path.join(starterRoot, "apps/web/.env.example"))).toBe(true);
    expect(fs.existsSync(path.join(starterRoot, "apps/web/.env"))).toBe(false);
    expect(fs.existsSync(path.join(starterRoot, "node_modules"))).toBe(false);
    expect(fs.existsSync(path.join(starterRoot, "apps/web/.next"))).toBe(false);
    expect(fs.existsSync(path.join(rulesRoot, "scaffold-modules/registry.json"))).toBe(true);
    expect(fs.existsSync(path.join(rulesRoot, "scaffold-providers/registry.json"))).toBe(true);
    expect(fs.existsSync(path.join(rulesRoot, "unrelated"))).toBe(false);
  });

  it("downloads a version once and reuses the unpacked copy", async () => {
    const store = fakeStore(await packReleaseSnapshot(fixture()));
    const cacheRoot = tempDir();
    const first = await loadReleaseSnapshot("2.1.0", { store, cacheRoot });
    const second = await loadReleaseSnapshot("2.1.0", { store, cacheRoot });

    expect(first).toEqual(second);
    expect(first?.version).toBe("2.1.0");
    expect(fs.existsSync(path.join(first!.starterRoot, "apps/web/lib/utils.ts"))).toBe(true);
    expect(store.get).toHaveBeenCalledTimes(1);
    expect(store.get).toHaveBeenCalledWith("2.1.0");
  });

  it("returns null without a store or without a snapshot for that version", async () => {
    expect(await loadReleaseSnapshot("2.1.0", { store: null, cacheRoot: tempDir() })).toBeNull();
    expect(await loadReleaseSnapshot("2.1.0", { store: fakeStore(null), cacheRoot: tempDir() })).toBeNull();
  });

  it("leaves no cached copy behind when unpacking fails", async () => {
    const cacheRoot = tempDir();
    await expect(
      loadReleaseSnapshot("2.1.0", { store: fakeStore(new Uint8Array([1, 2, 3])), cacheRoot }),
    ).rejects.toThrow();
    expect(fs.readdirSync(cacheRoot)).toEqual([]);
  });

  it("refuses a version that is not x.y.z", async () => {
    await expect(loadReleaseSnapshot("../etc", { store: fakeStore(null), cacheRoot: tempDir() })).rejects.toThrow(
      /version/,
    );
  });

  it("has no store without R2 credentials", () => {
    expect(getReleaseSnapshotStore({} as NodeJS.ProcessEnv)).toBeNull();
  });
});
