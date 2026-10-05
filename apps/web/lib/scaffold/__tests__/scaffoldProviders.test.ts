// @vitest-environment node
import fs from "node:fs";
import path from "node:path";
import JSZip from "jszip";
import { afterAll, describe, expect, it, vi } from "vitest";

vi.mock("@workspace/database/client", () => ({ default: {} }));

import {
  compileScaffoldVariant,
  createTempScaffoldDir,
  findScaffoldLeaks,
  resolveProviderChoices,
  resolveWorkspacePath,
  type ProviderChoices,
  type ScaffoldModuleId,
} from "@/lib/scaffold-modules";
import { buildUpgradeKit, upgradeProviders } from "@/lib/scaffold/service";

const scaffoldRoot = resolveWorkspacePath("templates/saas-boilerplate");
const dirs: string[] = [];
afterAll(() => dirs.forEach((dir) => fs.rmSync(dir, { recursive: true, force: true })));

function compile(modules: ScaffoldModuleId[], providers?: ProviderChoices) {
  const dir = createTempScaffoldDir();
  dirs.push(dir);
  compileScaffoldVariant({ baseRoot: scaffoldRoot, tempDir: dir, selectedModules: modules, platforms: ["web"], providers });
  const read = (rel: string) => fs.readFileSync(path.join(dir, rel), "utf-8");
  const webPackage = JSON.parse(read("apps/web/package.json"));
  return {
    dir,
    read,
    exists: (rel: string) => fs.existsSync(path.join(dir, rel)),
    deps: { ...webPackage.dependencies, ...webPackage.devDependencies } as Record<string, string>,
  };
}

function listFiles(dir: string): string[] {
  return fs.readdirSync(dir, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => path.relative(dir, path.join(entry.parentPath, entry.name)))
    .sort();
}

describe("provider choices", () => {
  it("reads the wizard toggles, only inside selected modules", () => {
    const env = { NEXT_PUBLIC_PAYMENT_GATEWAY: "stripe", NEXT_PUBLIC_IMAGE_STORAGE: "cloudflare_r2", NEXT_PUBLIC_CMS: "strapi" };
    expect(resolveProviderChoices(env, ["billing"])).toEqual({ payment_gateway: "stripe", image_storage: "cloudflare_r2" });
    // No billing: the payment toggle does not apply. "strapi" is not a choice, so the CMS keeps everything.
    expect(resolveProviderChoices(env, [])).toEqual({ image_storage: "cloudflare_r2" });
    expect(resolveProviderChoices(env, ["billing"], { keepAll: true })).toEqual({});
  });
});

describe("provider pruning", () => {
  it("ships a Stripe-only billing variant without Dodo", () => {
    const variant = compile(["billing"], { payment_gateway: "stripe" });

    expect(variant.exists("apps/web/app/api/payments/stripe/webhook/route.ts")).toBe(true);
    expect(variant.exists("apps/web/tests/integration/stripeWebhookRoute.test.ts")).toBe(true);
    expect(variant.exists("apps/web/app/api/payments/dodo")).toBe(false);
    expect(variant.deps).toHaveProperty("stripe");
    expect(variant.deps).not.toHaveProperty("dodopayments");
    expect(variant.deps).not.toHaveProperty("@dodopayments/nextjs");
    expect(variant.read("apps/web/.env.example")).toMatch(/^NEXT_PUBLIC_PAYMENT_GATEWAY=stripe$/m);
    expect(variant.read("apps/web/.env.example")).not.toContain("DODO_");
    expect(variant.read("apps/web/lib/env.ts")).not.toContain("DODO_");
    expect(variant.read("apps/web/trpc/routers/billingProcedures.ts")).toContain('const DEFAULT_PAYMENT_GATEWAY = "stripe";');
    expect(findScaffoldLeaks(variant.dir, ["billing"], undefined, { payment_gateway: "stripe" })).toEqual([]);
  });

  it("drops the Notion package and SDKs when the CMS is Postgres", () => {
    const variant = compile([], { cms: "postgres" });

    expect(variant.exists("packages/cms")).toBe(false);
    expect(variant.deps).not.toHaveProperty("@workspace/cms");
    expect(variant.read("packages/database/package.json")).not.toContain("@notionhq/client");
    expect(variant.read("apps/web/lib/cms-provider.ts")).toContain('const DEFAULT_CMS = "postgres";');
    expect(variant.read("pnpm-lock.yaml")).not.toMatch(/^ {2}packages\/cms:$/m);
  });

  it("keeps every provider when nothing is chosen", () => {
    const keepAll = compile(["billing"], {});
    const unset = compile(["billing"]);
    expect(listFiles(keepAll.dir)).toEqual(listFiles(unset.dir));
    expect(keepAll.deps).toMatchObject({ stripe: expect.any(String), dodopayments: expect.any(String) });
  });

  it("reports provider code that survives pruning", () => {
    const variant = compile(["billing"], { payment_gateway: "stripe" });
    fs.writeFileSync(path.join(variant.dir, "apps/web/lib/stray.ts"), "import DodoPayments from 'dodopayments';\n");
    expect(findScaffoldLeaks(variant.dir, ["billing"], undefined, { payment_gateway: "stripe" })).toEqual([
      expect.stringContaining("apps/web/lib/stray.ts: \"from 'dodopayments'\" (owned by unselected payment_gateway.dodo)"),
    ]);
  });
});

describe("provider switches in upgrades", () => {
  it("detects a switch and saves the new choice", () => {
    const config = { NEXT_PUBLIC_PAYMENT_GATEWAY: "stripe", NEXT_PUBLIC_CMS: "postgres" };
    const result = upgradeProviders(config, ["billing"], ["billing"], { payment_gateway: "dodo" });
    expect(result).toMatchObject({
      fromProviders: { payment_gateway: "stripe", cms: "postgres" },
      toProviders: { payment_gateway: "dodo", cms: "postgres" },
      switched: ["payment_gateway"],
      config: { NEXT_PUBLIC_PAYMENT_GATEWAY: "dodo", NEXT_PUBLIC_CMS: "postgres" },
    });
    expect(() => upgradeProviders(config, ["billing"], ["billing"], { payment_gateway: "paypal" })).toThrow(/Unknown provider/);
  });

  it("stages the new provider's code in the kit and lists the old one for removal", async () => {
    const kit = buildUpgradeKit({
      name: "Shop",
      projectName: "shop",
      fromModules: ["billing"],
      toModules: ["billing"],
      fromTierId: "tier-1",
      toTierId: "tier-1",
      versionId: "balanced",
      platforms: ["web"],
      config: {},
      fromProviders: { payment_gateway: "stripe" },
      toProviders: { payment_gateway: "dodo" },
    });
    const zip = await JSZip.loadAsync(new Uint8Array(await new Response(kit.stream).arrayBuffer()));
    const spec = JSON.parse(await zip.file("shop/UPGRADE_SPEC.json")!.async("string"));

    expect(spec.changedFiles.added).toContain("apps/web/app/api/payments/dodo/webhook/route.ts");
    expect(spec.changedFiles.removed).toContain("apps/web/app/api/payments/stripe/webhook/route.ts");
    expect(spec.changedFiles.modified).toContain("apps/web/package.json");
    expect(spec.providers).toEqual({ from: { payment_gateway: "stripe" }, to: { payment_gateway: "dodo" } });
  });
});
