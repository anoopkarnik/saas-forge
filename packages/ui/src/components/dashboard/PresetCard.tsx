import * as React from "react";
import { Badge } from "@workspace/ui/components/shadcn/badge";
import { cn } from "@workspace/ui/lib/utils";
import { PresetInfo } from "@workspace/ui/lib/constants/presets";

export function PresetCard({
    preset,
    active,
    onClick,
}: {
    preset: PresetInfo;
    active: boolean;
    onClick: () => void;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={cn(
                "rounded-2xl border p-4 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
                active
                    ? `${preset.bgColor} shadow-sm`
                    : "border-border/60 bg-background hover:border-primary/40",
            )}
        >
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <div className="flex items-center gap-2">
                        <preset.icon className={cn("h-4 w-4 shrink-0", preset.color)} />
                        <span className="text-sm font-semibold">{preset.name}</span>
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">{preset.tagline}</p>
                </div>
                {active ? (
                    <Badge className="shrink-0 bg-primary text-primary-foreground">
                        Selected
                    </Badge>
                ) : null}
            </div>
            <div className="mt-4 flex flex-wrap gap-2 text-xs text-muted-foreground">
                <Badge variant="outline">{preset.setupTime}</Badge>
                <Badge variant="outline">{preset.estimatedCost}</Badge>
                <Badge variant="outline">{preset.accountsNeeded.length} accounts</Badge>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
                Auto-selects: {preset.highlights.slice(0, 3).join(", ")}
            </p>
        </button>
    );
}
