import { getScaffoldCatalog, loadScaffoldRegistry } from "@/lib/scaffold-modules";

/**
 * The module catalog and prices API-key clients see (`/api/v1/scaffold/pricing`,
 * the CLI and the MCP `get_catalog` tool). Platform-only.
 */
export function getPublicPricing() {
  const registry = loadScaffoldRegistry();
  const catalog = new Map(getScaffoldCatalog(registry).modules.map((m) => [m.id, m]));
  const modules = registry.modules.map((m) => ({
    id: m.id,
    label: m.label,
    description: m.description,
    available: catalog.get(m.id)!.available,
    requires: m.requires,
    // Effective cost: not-yet-implemented modules are free until authored.
    creditsCost: m.implemented === false ? 0 : m.creditsCost,
    listedCreditsCost: m.creditsCost,
    downloadEnabled: m.downloadEnabled ?? true,
    implemented: m.implemented ?? true,
  }));

  return {
    baseCredits: registry.baseCreditsCost,
    tierUpgradeCreditsPerStep: registry.tierUpgradeCreditsPerStep ?? 0,
    modules,
  };
}
