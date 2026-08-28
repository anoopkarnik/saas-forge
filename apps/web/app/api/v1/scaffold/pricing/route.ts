import { NextRequest, NextResponse } from "next/server";
import { authenticateApiKey } from "@/server/authenticateApiKey";
import { loadScaffoldRegistry } from "@/lib/scaffold-modules";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const auth = await authenticateApiKey(req, { scopes: ["read:me"] });
  if (!auth.ok) return auth.response;

  const registry = loadScaffoldRegistry();
  const modules = registry.modules.map((m) => ({
    id: m.id,
    label: m.label,
    // Effective cost: not-yet-implemented modules are free until authored.
    creditsCost: m.implemented === false ? 0 : m.creditsCost,
    listedCreditsCost: m.creditsCost,
    downloadEnabled: m.downloadEnabled ?? true,
    implemented: m.implemented ?? true,
  }));

  return NextResponse.json({
    baseCredits: registry.baseCreditsCost,
    tierUpgradeCreditsPerStep: registry.tierUpgradeCreditsPerStep ?? 0,
    modules,
  });
}
