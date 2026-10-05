export type ScaffoldModuleId =
  | "billing"
  | "multi_tenancy"
  | "ai"
  | "api_keys"
  | "notifications";

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

export type ScaffoldCatalog = {
  baseCredits: number;
  tierUpgradeCreditsPerStep: number;
  modules: ScaffoldCatalogModule[];
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
