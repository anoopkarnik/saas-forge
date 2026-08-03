import { describe, expect, it } from "vitest";

import {
  PRODUCT_TYPE_BLUEPRINTS,
  TIER_BLUEPRINTS,
  VERSION_PROFILES,
  recommendTier,
  resolvePreset,
  type TierId,
} from "./presets";

describe("tiered starter presets", () => {
  it("defines 22 product types, six tiers, and three versions", () => {
    expect(PRODUCT_TYPE_BLUEPRINTS).toHaveLength(22);
    expect(TIER_BLUEPRINTS).toHaveLength(6);
    expect(VERSION_PROFILES).toHaveLength(3);
  });

  it("resolves every catalog combination into a complete, unique preset", () => {
    const resolved = PRODUCT_TYPE_BLUEPRINTS.flatMap((productType) =>
      TIER_BLUEPRINTS.flatMap((tier) =>
        VERSION_PROFILES.map((version) =>
          resolvePreset(productType.id, tier.id, version.id),
        ),
      ),
    );

    expect(resolved).toHaveLength(396);
    expect(new Set(resolved.map((preset) => preset.id)).size).toBe(396);

    const protectedIdentityFields = [
      "name",
      "NEXT_PUBLIC_SAAS_NAME",
      "NEXT_PUBLIC_COMPANY_NAME",
      "NEXT_PUBLIC_URL",
    ];

    for (const preset of resolved) {
      expect(preset.architecture.length).toBeGreaterThanOrEqual(3);
      expect(preset.includedInScaffold.length).toBeGreaterThan(0);
      expect(preset.addNext.length).toBeGreaterThan(0);
      expect(preset.accountsNeeded.length).toBeGreaterThan(0);
      expect(preset.steps.length).toBeGreaterThan(0);
      expect(preset.delivery.starterSetup).toBeTruthy();
      expect(preset.delivery.workingLaunch).toMatch(/weeks/);
      expect(preset.cost.low).toBeGreaterThanOrEqual(0);
      expect(preset.cost.high).toBeGreaterThanOrEqual(preset.cost.low);
      expect(preset.cost.lastReviewed).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(
        preset.modules.every((moduleId) =>
          ["billing", "ai"].includes(moduleId),
        ),
      ).toBe(true);
      expect(preset.values.SELECTED_MODULES).toEqual(preset.modules);
      expect(
        Object.keys(preset.values).filter((key) =>
          protectedIdentityFields.includes(key),
        ),
      ).toEqual([]);
      expect(
        Object.keys(preset.values).filter(
          (key) =>
            key === "DATABASE_URL" ||
            key.endsWith("_SECRET") ||
            key.endsWith("_TOKEN") ||
            key.endsWith("_API_KEY"),
        ),
      ).toEqual([]);
    }
  });

  it.each([
    [{ kind: "mvp" } as const, "tier-1"],
    [{ kind: "beta" } as const, "tier-2"],
    [{ kind: "mau", value: 0 } as const, "tier-3"],
    [{ kind: "mau", value: 9_999 } as const, "tier-3"],
    [{ kind: "mau", value: 10_000 } as const, "tier-4"],
    [{ kind: "mau", value: 49_999 } as const, "tier-4"],
    [{ kind: "mau", value: 50_000 } as const, "tier-5"],
    [{ kind: "mau", value: 249_999 } as const, "tier-5"],
    [{ kind: "mau", value: 250_000 } as const, "tier-6"],
  ])("recommends the expected tier for %o", (stage, expectedTier) => {
    expect(recommendTier(stage)).toBe(expectedTier as TierId);
  });

  it("does not expose unavailable modules for team-oriented products", () => {
    const preset = resolvePreset(
      "project-task-management",
      "tier-6",
      "advanced",
    );

    expect(preset.modules).not.toContain("multi_tenancy");
    expect(preset.modules).not.toContain("notifications");
    expect(preset.modules).not.toContain("api_keys");
  });
});
