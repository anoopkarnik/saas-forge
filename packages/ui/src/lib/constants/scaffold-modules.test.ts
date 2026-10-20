import { describe, expect, it } from "vitest";
import { toggleModule, type ScaffoldCatalog } from "./scaffold-modules";

const module = (id: ScaffoldCatalog["modules"][number]["id"], requires: ScaffoldCatalog["modules"][number]["requires"] = []) => ({
  id,
  label: id,
  description: id,
  creditsCost: 10,
  available: true,
  requires,
  incompatibleWith: [],
});

const catalog: ScaffoldCatalog = {
  baseCredits: 20,
  tierUpgradeCreditsPerStep: 3,
  modules: [module("billing"), module("ai"), module("ai_agents", ["ai"])],
};

describe("toggleModule", () => {
  it("selects what a module requires", () => {
    expect(toggleModule(catalog, ["billing"], "ai_agents").sort()).toEqual(["ai", "ai_agents", "billing"]);
  });

  it("drops modules that need a module being deselected", () => {
    expect(toggleModule(catalog, ["billing", "ai", "ai_agents"], "ai")).toEqual(["billing"]);
  });

  it("keeps the requirement when only the dependent is deselected", () => {
    expect(toggleModule(catalog, ["ai", "ai_agents"], "ai_agents")).toEqual(["ai"]);
  });
});
