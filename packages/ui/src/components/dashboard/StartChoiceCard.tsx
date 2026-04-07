import * as React from "react";
import { cn } from "@workspace/ui/lib/utils";

export function StartChoiceCard({
    title,
    description,
    icon,
    active,
    onClick,
}: {
    title: string;
    description: string;
    icon: React.ReactNode;
    active: boolean;
    onClick: () => void;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={cn(
                "rounded-2xl border p-5 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
                active
                    ? "border-primary bg-primary/10 shadow-sm"
                    : "border-border/60 bg-background hover:border-primary/40",
            )}
        >
            <div className="flex items-start gap-3">
                <div className="rounded-xl bg-muted p-2 text-primary">{icon}</div>
                <div>
                    <div className="text-sm font-semibold">{title}</div>
                    <p className="mt-1 text-sm text-muted-foreground">{description}</p>
                </div>
            </div>
        </button>
    );
}
