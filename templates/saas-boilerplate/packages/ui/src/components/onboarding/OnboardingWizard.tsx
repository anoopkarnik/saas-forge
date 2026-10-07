"use client";

import * as React from "react";
import { Button } from "@workspace/ui/components/shadcn/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/shadcn/dialog";
import { cn } from "@workspace/ui/lib/utils";

export const ONBOARDING_QUESTIONS = [
  { id: "role", title: "What do you do?", options: ["Founder", "Engineer", "Product", "Design", "Other"] },
  { id: "teamSize", title: "How big is your team?", options: ["Just me", "2–10", "11–50", "51+"] },
  { id: "useCase", title: "What are you here for?", options: ["Trying it out", "A side project", "A product for customers", "Internal tools"] },
] as const;

/**
 * The welcome wizard (onboarding module): a few skippable questions.
 * Presentational: the app stores answers and decides when it opens.
 */
export function OnboardingWizard({
  open,
  step,
  answers,
  saving = false,
  onAnswer,
  onSkip,
}: {
  open: boolean;
  step: number;
  answers: Record<string, string>;
  saving?: boolean;
  onAnswer: (step: number, answers: Record<string, string>, finish: boolean) => void;
  onSkip: () => void;
}) {
  const index = Math.min(step, ONBOARDING_QUESTIONS.length - 1);
  const question = ONBOARDING_QUESTIONS[index]!;
  const last = index === ONBOARDING_QUESTIONS.length - 1;
  const selected = answers[question.id];

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onSkip()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{question.title}</DialogTitle>
          <DialogDescription>
            Step {index + 1} of {ONBOARDING_QUESTIONS.length}. This helps us suggest what to set up first; you can skip it.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-2">
          {question.options.map((option) => (
            <Button
              key={option}
              type="button"
              variant="outline"
              className={cn("h-auto justify-start py-3", selected === option && "border-primary bg-primary/10")}
              onClick={() => onAnswer(index, { [question.id]: option }, false)}
            >
              {option}
            </Button>
          ))}
        </div>
        <DialogFooter className="gap-2 sm:justify-between">
          <Button type="button" variant="ghost" onClick={onSkip} disabled={saving}>
            Skip for now
          </Button>
          <Button
            type="button"
            disabled={!selected || saving}
            onClick={() => onAnswer(index + 1, {}, last)}
          >
            {last ? "Finish" : "Next"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
