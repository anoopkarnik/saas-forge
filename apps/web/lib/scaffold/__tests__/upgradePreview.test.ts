// @vitest-environment node
import JSZip from "jszip";
import { describe, expect, it, vi } from "vitest";

vi.mock("@workspace/database/client", () => ({ default: {} }));

import type { ScaffoldModuleId } from "@/lib/scaffold-modules";
import { buildUpgradeKit, previewUpgrade } from "@/lib/scaffold/service";

async function readStream(stream: ReadableStream): Promise<Uint8Array> {
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

describe("previewUpgrade", () => {
  it("counts exactly the files the paid upgrade kit stages", async () => {
    const input = {
      fromModules: ["billing"] as ScaffoldModuleId[],
      toModules: ["billing", "ai"] as ScaffoldModuleId[],
      fromTierId: "tier-1",
      toTierId: "tier-2",
      platforms: ["web", "mobile"],
    };
    const preview = previewUpgrade(input);

    const kit = buildUpgradeKit({ ...input, name: "Demo", projectName: "demo", versionId: "balanced", config: {} });
    const zip = await JSZip.loadAsync(await readStream(kit.stream));
    const staged = Object.values(zip.files).filter((file) => !file.dir && file.name.startsWith("demo/.upgrade/"));
    const spec = JSON.parse(await zip.file("demo/UPGRADE_SPEC.json")!.async("string"));

    expect(preview.files.added + preview.files.modified).toBe(staged.length);
    expect(preview.files).toEqual({
      added: spec.changedFiles.added.length,
      modified: spec.changedFiles.modified.length,
      removed: spec.changedFiles.removed.length,
    });
    expect(preview.delta).toMatchObject({ addedModules: ["ai"], tierSteps: 1 });
    // The ai module owns the chat migrations, so the kit brings them.
    expect(preview.migrations.length).toBeGreaterThan(0);
    for (const migration of preview.migrations) {
      expect(staged.some((file) => file.name === `demo/.upgrade/packages/database/prisma/migrations/${migration}/migration.sql`)).toBe(true);
    }
  });

  it("finds nothing to stage for a tier-only upgrade", () => {
    const preview = previewUpgrade({ fromModules: [], toModules: [], fromTierId: "tier-1", toTierId: "tier-3", platforms: ["web"] });
    expect(preview.files).toEqual({ added: 0, modified: 0, removed: 0 });
    expect(preview.delta.tierSteps).toBe(2);
  });
});
