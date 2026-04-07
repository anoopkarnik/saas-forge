import * as React from "react";
import { AlertTriangle } from "lucide-react";
import { Badge } from "@workspace/ui/components/shadcn/badge";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@workspace/ui/components/shadcn/card";
import { Progress } from "@workspace/ui/components/shadcn/progress";
import { Separator } from "@workspace/ui/components/shadcn/separator";
import {
    calculateScaffoldCredits,
    BASE_SCAFFOLD_CREDITS_COST,
} from "@workspace/ui/lib/constants/scaffold-modules";
import { WIZARD_STEPS, WizardStepId } from "@workspace/ui/lib/scaffold-wizard";
import { PresetInfo } from "@workspace/ui/lib/constants/presets";
import { EntryChoice } from "../DashboardPage";
import { FormValues } from "@workspace/ui/lib/zod/download";

function formatList(values: string[]) {
    if (values.length === 0) return "None selected yet";
    if (values.length === 1) return values[0];
    if (values.length === 2) return `${values[0]} & ${values[1]}`;
    return `${values.slice(0, -1).join(", ")} & ${values[values.length - 1]}`;
}

export function WizardSummary({
    currentStepIndex,
    completionByStep,
    selectedPreset,
    entryChoice,
    pricing,
    values,
    missingLabels,
}: {
    currentStepIndex: number;
    completionByStep: Record<WizardStepId, boolean>;
    selectedPreset: PresetInfo | null;
    entryChoice: EntryChoice;
    pricing: ReturnType<typeof calculateScaffoldCredits>;
    values: FormValues;
    missingLabels: string[];
}) {
    const progressValue =
        (Object.values(completionByStep).filter(Boolean).length /
            WIZARD_STEPS.length) *
        100;

    return (
        <div className="space-y-4 xl:sticky xl:top-6">
            <Card className="border-border/60 shadow-sm">
                <CardHeader className="pb-3">
                    <CardTitle className="text-base">Scaffold Summary</CardTitle>
                    <CardDescription>
                        A calmer view of what is selected and what still needs attention.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                            <span className="font-medium">Progress</span>
                            <span className="text-muted-foreground">
                                Step {currentStepIndex + 1} of {WIZARD_STEPS.length}
                            </span>
                        </div>
                        <Progress value={progressValue} />
                    </div>

                    <div className="space-y-2">
                        {WIZARD_STEPS.map((step) => (
                            <div
                                key={step.id}
                                className="flex items-center justify-between rounded-xl border border-border/50 px-3 py-2 text-sm"
                            >
                                <span>{step.title}</span>
                                <Badge
                                    variant={completionByStep[step.id] ? "default" : "outline"}
                                >
                                    {completionByStep[step.id] ? "Ready" : "Pending"}
                                </Badge>
                            </div>
                        ))}
                    </div>

                    <Separator />

                    <div className="space-y-2 text-sm">
                        <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Starting point</span>
                            <span className="font-medium capitalize">
                                {selectedPreset?.name ?? entryChoice}
                            </span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Product</span>
                            <span className="font-medium">
                                {values.NEXT_PUBLIC_SAAS_NAME || "Not named yet"}
                            </span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Platforms</span>
                            <span className="font-medium">
                                {formatList(values.NEXT_PUBLIC_PLATFORM || [])}
                            </span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Billing feature</span>
                            <span className="font-medium">
                                {(values.SELECTED_MODULES || []).includes("billing")
                                    ? "Included"
                                    : "Not included"}
                            </span>
                        </div>
                    </div>

                    <Separator />

                    <div className="rounded-2xl bg-muted/40 p-4">
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">Credits total</span>
                            <span className="text-lg font-semibold">
                                {pricing.totalCredits}
                            </span>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                            {BASE_SCAFFOLD_CREDITS_COST} base credits
                            {pricing.moduleCredits.length > 0
                                ? ` + ${pricing.moduleCredits
                                    .map((entry) => `${entry.credits} for ${entry.label}`)
                                    .join(", ")}`
                                : ""}
                        </p>
                    </div>

                    <div className="rounded-2xl border border-border/60 p-4">
                        <div className="flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4 text-amber-500" />
                            <span className="text-sm font-medium">Missing Before Download</span>
                        </div>
                        {missingLabels.length > 0 ? (
                            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                                {missingLabels.slice(0, 6).map((label) => (
                                    <li key={label} className="flex items-start gap-2">
                                        <span className="mt-1 h-1.5 w-1.5 rounded-full bg-amber-500" />
                                        <span>{label}</span>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="mt-3 text-sm text-emerald-600 dark:text-emerald-400">
                                Everything required for download is filled in.
                            </p>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
