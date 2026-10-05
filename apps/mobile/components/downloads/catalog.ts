// Scaffold prices come only from the server's `scaffold.catalog` procedure
// (scaffold-modules/registry.json). Never hardcode credit amounts here.

export type ScaffoldCatalogModule = {
    id: string;
    label: string;
    description: string;
    creditsCost: number;
    available: boolean;
};

export type ScaffoldCatalog = {
    baseCredits: number;
    modules: ScaffoldCatalogModule[];
};

export async function fetchScaffoldCatalog(apiUrl: string): Promise<ScaffoldCatalog> {
    const res = await fetch(`${apiUrl}/api/trpc/scaffold.catalog`);
    if (!res.ok) {
        throw new Error("Failed to load scaffold prices");
    }
    const json = await res.json();
    return json.result.data as ScaffoldCatalog;
}

/** The server answered 409: prices changed since the catalog was loaded. */
export class PriceChangedError extends Error {}

/** Same sum as the server; downloads send it as expectedTotalCredits. */
export function totalCredits(catalog: ScaffoldCatalog, selectedModules: string[]): number {
    return catalog.modules
        .filter((module) => selectedModules.includes(module.id))
        .reduce((sum, module) => sum + module.creditsCost, catalog.baseCredits);
}
