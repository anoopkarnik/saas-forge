/** Selecting a module also selects what it requires (e.g. ai_agents needs ai). */
export function withRequirements(pricing, modules) {
  const requires = new Map(pricing.modules.map((module) => [module.id, module.requires ?? []]));
  const out = new Set();
  const add = [...modules];
  while (add.length) {
    const id = add.pop();
    if (out.has(id)) continue;
    out.add(id);
    add.push(...(requires.get(id) ?? []));
  }
  return [...out];
}

/** Same total the server charges for a new download. */
export function quoteDownload(pricing, modules) {
  const cost = new Map(pricing.modules.map((module) => [module.id, module.creditsCost]));
  return modules.reduce((sum, id) => sum + (cost.get(id) ?? 0), pricing.baseCredits);
}

const tierNumber = (tier) => Number.parseInt(String(tier).replace(/^tier-/, ""), 10) || 0;

/** Same delta the server charges for an upgrade: added modules plus tier steps. */
export function quoteUpgrade(pricing, fromModules, toModules, fromTier, toTier) {
  const cost = new Map(pricing.modules.map((module) => [module.id, module.creditsCost]));
  const added = toModules.filter((id) => !fromModules.includes(id));
  const steps = Math.max(0, tierNumber(toTier) - tierNumber(fromTier));
  return {
    added,
    tierSteps: steps,
    credits: added.reduce((sum, id) => sum + (cost.get(id) ?? 0), 0) + steps * pricing.tierUpgradeCreditsPerStep,
  };
}
