import * as React from "react";
import { cn } from "@workspace/ui/lib/utils";

export function StartChoiceCard({
    title,
    description,
    icon,
    active,
    onClick,
    disabled = false,
}: {
    title: string;
    description: string;
    icon: React.ReactNode;
    active: boolean;
    onClick?: () => void;
    disabled?: boolean;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            className={cn(
                "rounded-2xl border p-5 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 disabled:cursor-not-allowed disabled:opacity-50",
                active
                    ? "border-primary bg-primary/10 shadow-sm"
                    : "border-border/60 bg-background enabled:hover:border-primary/40",
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
