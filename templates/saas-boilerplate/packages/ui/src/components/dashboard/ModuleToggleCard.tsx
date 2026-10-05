import * as React from "react";
import { CircleDot } from "lucide-react";
import { Badge } from "@workspace/ui/components/shadcn/badge";
import { cn } from "@workspace/ui/lib/utils";
import type { ScaffoldCatalogModule } from "@workspace/ui/lib/constants/scaffold-modules";

/** Selectable card for one paid scaffold module on the wizard's Features step. */
export function ModuleToggleCard({
    module,
    selected,
    onToggle,
}: {
    module: ScaffoldCatalogModule;
    selected: boolean;
    onToggle: () => void;
}) {
    return (
        <button
            type="button"
            onClick={onToggle}
            className={cn(
                "w-full rounded-2xl border p-4 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
                selected
                    ? "border-primary bg-primary/10 shadow-sm"
                    : "border-border/60 bg-background hover:border-primary/40",
            )}
        >
            <div className="flex items-center justify-between gap-3">
                <div>
                    <div className="flex items-center gap-2 text-sm font-semibold">
                        <CircleDot className="h-4 w-4 text-primary" />
                        {module.label}
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">{module.description}</p>
                </div>
                <Badge variant={selected ? "default" : "outline"}>
                    {selected ? "Included" : `+${module.creditsCost} credits`}
                </Badge>
            </div>
        </button>
    );
}
