// Scaffold prices come only from the server's `scaffold.catalog` procedure
// (scaffold-modules/registry.json). Never hardcode credit amounts here.

export type ScaffoldCatalogModule = {
    id: string;
    label: string;
    description: string;
    creditsCost: number;
    available: boolean;
    requires: string[];
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

/** Same rule as the web wizard: selecting adds requirements, deselecting drops dependents. */
export function toggleModule(catalog: ScaffoldCatalog, selected: string[], moduleId: string): string[] {
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

