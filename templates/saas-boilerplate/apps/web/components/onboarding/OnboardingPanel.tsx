"use client";

import React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@workspace/ui/components/shadcn/button";
import { OnboardingChecklist } from "@workspace/ui/components/onboarding/OnboardingChecklist";
import { OnboardingWizard } from "@workspace/ui/components/onboarding/OnboardingWizard";
import { useTRPC } from "@/trpc/client";

/** First-run wizard and setup checklist for the home page (onboarding module). Never blocks the page. */
export function OnboardingPanel() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const state = useQuery(trpc.onboarding.state.queryOptions());
  const refresh = () => queryClient.invalidateQueries({ queryKey: trpc.onboarding.state.queryKey() });
  const onError = (error: { message: string }) => toast.error(error.message);

  const answer = useMutation(trpc.onboarding.answer.mutationOptions({ onSuccess: refresh, onError }));
  const setWizard = useMutation(trpc.onboarding.setWizard.mutationOptions({ onSuccess: refresh, onError }));
  const dismiss = useMutation(trpc.onboarding.dismiss.mutationOptions({ onSuccess: refresh, onError }));
  const complete = useMutation(trpc.onboarding.complete.mutationOptions({ onSuccess: refresh }));

  const data = state.data;
  if (!data) return null;

  return (
    <div className="flex flex-col gap-3">
      <OnboardingWizard
        open={data.showWizard}
        step={data.step}
        answers={data.answers}
        saving={answer.isPending || setWizard.isPending}
        onAnswer={(step, answers, finish) => answer.mutate({ step, answers, finish })}
        onSkip={() => setWizard.mutate({ open: false })}
      />
      {data.checklist ? (
        <OnboardingChecklist
          tasks={data.checklist.tasks}
          onDismiss={() => dismiss.mutate({ dismissed: true })}
          onComplete={(taskKey) => complete.mutate({ taskKey })}
        />
      ) : null}
      {data.checklistDismissed || !data.showWizard ? (
        <div className="flex flex-wrap gap-2 text-xs">
          {data.checklistDismissed ? (
            <Button variant="link" size="sm" className="h-auto p-0 text-xs" onClick={() => dismiss.mutate({ dismissed: false })}>
              Show the setup checklist
            </Button>
          ) : null}
          {!data.showWizard ? (
            <Button variant="link" size="sm" className="h-auto p-0 text-xs" onClick={() => setWizard.mutate({ open: true })}>
              Retake the welcome questions
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
