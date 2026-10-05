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

// Counts-only preview of a selection, from the server's `scaffold.previewIndex`
// (the web wizard shows the full file tree). It is served by /api/scaffold/trpc,
// the only tRPC endpoint deployed with the starter source.
type PreviewIndex = {
    files: Array<{ path: string; module: string | null; category: string }>;
    envVars: Array<{ key: string; module: string | null }>;
    models: Array<{ name: string; module: string | null }>;
};

export async function fetchPreviewIndex(apiUrl: string): Promise<PreviewIndex> {
    const res = await fetch(`${apiUrl}/api/scaffold/trpc/scaffold.previewIndex`);
    if (!res.ok) throw new Error("Failed to load the file preview");
    const json = await res.json();
    return json.result.data as PreviewIndex;
}

const PLATFORM_ROOTS: Record<string, string> = { mobile: "apps/mobile/", desktop: "apps/desktop/" };

export function previewCounts(index: PreviewIndex, modules: string[], platforms: string[]) {
    const keep = (module: string | null) => module === null || modules.includes(module);
    const files = index.files.filter(
        (file) =>
            keep(file.module) &&
            Object.entries(PLATFORM_ROOTS).every(([platform, root]) => platforms.includes(platform) || !file.path.startsWith(root)),
    );
    return {
        files: files.length,
        routes: files.filter((file) => file.category === "route").length,
        models: index.models.filter((model) => keep(model.module)).length,
        envVars: index.envVars.filter((env) => keep(env.module)).length,
    };
}

