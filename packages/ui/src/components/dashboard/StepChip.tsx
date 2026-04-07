import * as React from "react";
import { Check } from "lucide-react";
import { cn } from "@workspace/ui/lib/utils";
import { WIZARD_STEPS } from "@workspace/ui/lib/scaffold-wizard";

export function StepChip({
    step,
    index,
    currentStepIndex,
    isComplete,
    onClick,
}: {
    step: (typeof WIZARD_STEPS)[number];
    index: number;
    currentStepIndex: number;
    isComplete: boolean;
    onClick: () => void;
}) {
    const isActive = index === currentStepIndex;

    return (
        <button
            type="button"
            onClick={onClick}
            className={cn(
                "flex min-w-[140px] items-center gap-3 rounded-2xl border px-4 py-3 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
                isActive
                    ? "border-primary bg-primary/10 shadow-sm"
                    : "border-border/60 bg-background hover:border-primary/40",
            )}
            aria-current={isActive ? "step" : undefined}
        >
            <span
                className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-sm font-semibold",
                    isActive
                        ? "border-primary bg-primary text-primary-foreground"
                        : isComplete
                            ? "border-emerald-500 bg-emerald-500 text-white"
                            : "border-border/60 bg-muted text-muted-foreground",
                )}
            >
                {isComplete && !isActive ? <Check className="h-4 w-4" /> : index + 1}
            </span>
            <span className="min-w-0">
                <span className="block text-sm font-semibold">{step.title}</span>
                <span className="block text-xs text-muted-foreground">
                    {step.description}
                </span>
            </span>
        </button>
    );
}
