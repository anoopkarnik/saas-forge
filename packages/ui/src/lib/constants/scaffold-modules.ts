export type ScaffoldModuleId =
  | "billing"
  | "multi_tenancy"
  | "ai"
  | "ai_agents"
  | "api_keys"
  | "jobs"
  | "notifications"
  | "audit_log"
  | "webhooks"
  | "feature_flags";

// Prices and availability come only from the server's `scaffold.catalog`
// (scaffold-modules/registry.json). Never hardcode credit amounts in clients.

export type ScaffoldCatalogModule = {
  id: ScaffoldModuleId;
  label: string;
  description: string;
  creditsCost: number;
  available: boolean;
  requires: ScaffoldModuleId[];
  incompatibleWith: ScaffoldModuleId[];
};

export type ScaffoldCatalogProvider = {
  id: string;
  label: string;
  /** The wizard's env toggle, e.g. NEXT_PUBLIC_PAYMENT_GATEWAY. */
  env: string;
  module: ScaffoldModuleId | null;
  values: string[];
};
export type ScaffoldCatalog = {
  baseCredits: number;
  tierUpgradeCreditsPerStep: number;
  modules: ScaffoldCatalogModule[];
  /** Provider toggles whose unchosen values a download leaves out. */
  providers?: ScaffoldCatalogProvider[];
};

export type ScaffoldQuote = {
  baseCredits: number;
  moduleCredits: Array<{ moduleId: ScaffoldModuleId; credits: number; label: string }>;
  totalCredits: number;
};

/**
 * Prices a selection with the catalog's numbers, matching the server's
 * calculateScaffoldCredits. Downloads send the total as expectedTotalCredits,
 * and the server answers 409 price_changed if it no longer matches.
 */
export function quoteFromCatalog(
  catalog: ScaffoldCatalog,
  selectedModules: ScaffoldModuleId[],
): ScaffoldQuote {
  const selectedSet = new Set(selectedModules);
  const moduleCredits = catalog.modules
    .filter((module) => selectedSet.has(module.id))
    .map((module) => ({ moduleId: module.id, credits: module.creditsCost, label: module.label }));

  return {
    baseCredits: catalog.baseCredits,
    moduleCredits,
    totalCredits:
      catalog.baseCredits + moduleCredits.reduce((sum, entry) => sum + entry.credits, 0),
  };
}

/**
 * Toggles a module while honouring `requires`: selecting a module also selects
 * what it needs, and deselecting one drops every module that needs it.
 */
export function toggleModule(
  catalog: ScaffoldCatalog,
  selected: ScaffoldModuleId[],
  moduleId: ScaffoldModuleId,
): ScaffoldModuleId[] {
  const requires = new Map(catalog.modules.map((module) => [module.id, module.requires]));
  const next = new Set(selected);

  if (next.has(moduleId)) {
    const drop = [moduleId];
    while (drop.length > 0) {
      const id = drop.pop()!;
      next.delete(id);
      for (const [dependent, needs] of requires) {
        if (next.has(dependent) && needs.includes(id)) drop.push(dependent);
      }
    }
  } else {
    const add = [moduleId];
    while (add.length > 0) {
      const id = add.pop()!;
      if (next.has(id)) continue;
      next.add(id);
      add.push(...(requires.get(id) ?? []));
    }
  }
  return [...next];
}

