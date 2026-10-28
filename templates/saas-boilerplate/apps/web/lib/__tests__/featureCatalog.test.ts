import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { documentationData, landingPageData } from "@workspace/database/constants";
import { cmsFeaturesSchema, featureGroupsSchema } from "@workspace/ui/lib/feature-content";

const root = path.resolve(import.meta.dirname, "../../../..");
const registry = JSON.parse(readFileSync(path.join(root, "scaffold-modules/registry.json"), "utf8"));
// Two explorer entries explain Billing; every other optional module has one entry.
const moduleFeatures: Record<string, string[]> = {
  billing: ["billing", "usage"], multi_tenancy: ["multi-tenancy"], ai: ["ai"],
  ai_agents: ["ai-agents"], api_keys: ["api-keys"], mcp: ["mcp"], jobs: ["jobs"],
  notifications: ["notifications"], audit_log: ["audit-log"], webhooks: ["webhooks"],
  feature_flags: ["feature-flags"], onboarding: ["onboarding"], analytics: ["analytics"],
};
const featureSectionData = landingPageData.featureSection;
const features = featureSectionData.features;
const byKey = new Map(features.map((feature) => [feature.details.key, feature]));

describe("feature explorer catalog", () => {
  it("has valid editable content, stable unique keys, six groups and Email first", () => {
    expect(featureGroupsSchema.safeParse(featureSectionData.groups).success).toBe(true);
    expect(cmsFeaturesSchema.safeParse(features).success).toBe(true);
    expect(features).toHaveLength(24);
    expect(featureSectionData.groups.map(({ label }) => label)).toEqual([
      "Foundation", "Monetization", "Users & teams", "AI & automation", "Operations", "SaaS Forge platform",
    ]);
    expect(features[0]?.title).toBe("Email");
    const groups = new Set(featureSectionData.groups.map(({ key }) => key));
    for (const [index, feature] of features.entries()) {
      expect(feature.sortOrder).toBe(index);
      expect(groups.has(feature.details.groupKey)).toBe(true);
      expect(feature.details.bullets.length).toBeGreaterThanOrEqual(4);
      expect(feature.details.bullets.length).toBeLessThanOrEqual(6);
    }
  });

  it("covers all implemented modules and mirrors their required dependencies", () => {
    const modules = registry.modules.filter((module: { implemented: boolean }) => module.implemented);
    expect(modules).toHaveLength(13);
    expect(Object.keys(moduleFeatures).sort()).toEqual(modules.map((module: { id: string }) => module.id).sort());
    for (const module of modules) {
      for (const key of moduleFeatures[module.id]!) {
        const feature = byKey.get(key)!;
        expect(feature, module.id).toBeDefined();
        expect(feature.details.inclusion).toBe("optional");
        expect(feature.details.dependencies).toEqual(module.requires.map((required: string) => moduleFeatures[required]![0]));
      }
    }
    expect(features.filter(({ details }) => details.inclusion === "optional").map(({ details }) => details.key).sort())
      .toEqual(Object.values(moduleFeatures).flat().sort());
    for (const feature of features) {
      for (const dependency of feature.details.dependencies) expect(byKey.has(dependency)).toBe(true);
    }
  });

  it("links every feature to a registered documentation page that exists", () => {
    for (const feature of features) {
      const slug = feature.details.documentationUrl.replace("/landing/doc/", "");
      const doc = documentationData.find((page) => page.slug === slug);
      expect(doc, feature.title).toBeDefined();
      expect(existsSync(path.join(root, "packages/database/src/docs", doc!.filePath))).toBe(true);
    }
  });

  it("bundles every tool logo locally with provenance and preserves legacy images", () => {
    const sources = JSON.parse(readFileSync(path.join(root, "apps/web/public/cms/tools/sources.json"), "utf8"));
    for (const feature of features) {
      if (feature.imageUrl) expect(existsSync(path.join(root, "apps/web/public", feature.imageUrl))).toBe(true);
      for (const group of feature.details.toolGroups) {
        for (const tool of group.tools) {
          expect(tool.logoUrl).toMatch(/^\/cms\/tools\/[a-z-]+\.(svg|png)$/);
          const logo = path.join(root, "apps/web/public", tool.logoUrl);
          expect(existsSync(logo), tool.name).toBe(true);
          expect(sources[path.basename(logo)], tool.name).toBeDefined();
          const content = readFileSync(logo);
          if (logo.endsWith(".svg")) {
            expect(content.toString()).toMatch(/<svg\b/);
            expect(content.toString()).not.toMatch(/<script\b|<foreignObject\b|(?:href|src)=["']https?:/i);
          } else expect(content.subarray(0, 8).toString("hex")).toBe("89504e470d0a1a0a");
        }
      }
    }
  });

  it("distinguishes providers, frameworks and platform-only services", () => {
    expect(byKey.get("email")!.details.toolGroups).toMatchObject([
      { relationship: "built-with", tools: [{ name: "Resend" }, { name: "React Email" }] },
    ]);
    expect(byKey.get("billing")!.details.toolGroups).toMatchObject([
      { relationship: "choose-one", tools: [{ name: "Stripe" }, { name: "Dodo Payments" }] },
    ]);
    expect(byKey.get("storage")!.details.toolGroups).toMatchObject([
      { relationship: "choose-one", tools: [{ name: "Cloudflare R2" }, { name: "Vercel Blob" }] },
    ]);
    expect(byKey.get("auth")!.details.toolGroups).toMatchObject([
      { relationship: "built-with", tools: [{ name: "Better Auth" }] },
      { relationship: "sign-in", tools: [{ name: "Google" }, { name: "GitHub" }, { name: "LinkedIn" }] },
    ]);
    expect(features.filter(({ details }) => details.inclusion === "platform").map(({ details }) => details.key))
      .toEqual(["launchpad", "upgrades"]);
    for (const key of ["launchpad", "upgrades"]) expect(byKey.get(key)!.details.groupKey).toBe("platform");
  });
});
