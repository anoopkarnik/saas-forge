"use client";

import React, { useState } from "react";
import { Button } from "@workspace/ui/components/shadcn/button";
import type {
  LaunchpadAIView,
  LaunchpadOperationKind,
  OperationView,
} from "@/lib/scaffold/launchpad/ai-types";
import type { StageId } from "@/lib/scaffold/launchpad/types";

export type StartOperation = {
  kind: LaunchpadOperationKind;
  stage: StageId;
  taskId?: string;
  message?: string;
};
export type LaunchpadAIActions = {
  onStartOperation?: (input: StartOperation) => void;
  onCancelOperation?: (jobId: string) => void;
};
const inputStyle =
  "min-h-11 w-full rounded-md border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
export const operationActive = (operation: OperationView) =>
  operation.status === "PENDING" || operation.status === "RUNNING";

export function OperationStatus({
  operation,
  busy,
  onCancelOperation,
  onStartOperation,
}: LaunchpadAIActions & { operation: OperationView; busy: boolean }) {
  const label =
    operation.kind === "interview"
      ? "An earlier guide request is still running"
      : operation.kind === "help"
        ? "Preparing an answer for your task"
        : "An earlier AI checklist request is still running. Your curated guide is ready to use";
  if (operationActive(operation))
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-muted/40 p-4">
        <p role="status" className="text-sm">
          {label}… You can leave and return while this runs.
        </p>
        <Button
          variant="outline"
          className="min-h-11"
          disabled={busy || !onCancelOperation}
          onClick={() => onCancelOperation?.(operation.jobId)}
        >
          Cancel request
        </Button>
      </div>
    );
  if (operation.status === "FAILED" || operation.status === "CANCELLED")
    return (
      <div className="rounded-lg border p-4">
        <p
          role={operation.status === "FAILED" ? "alert" : "status"}
          className="text-sm"
        >
          {operation.status === "FAILED"
            ? (operation.error ?? "Generation failed. Try again.")
            : "Generation cancelled. Your current guide is still available."}
        </p>
        <Button
          variant="outline"
          className="mt-3 min-h-11"
          disabled={busy || !onStartOperation || operation.kind === "help"}
          onClick={() =>
            onStartOperation?.({
              kind: operation.kind,
              stage: operation.stage,
              taskId: operation.taskId,
            })
          }
        >
          Retry generation
        </Button>
      </div>
    );
  return null;
}

export function TaskHelpPanel({
  ai,
  taskId,
  stage,
  busy,
  onStartOperation,
}: LaunchpadAIActions & {
  ai: LaunchpadAIView;
  taskId: string;
  stage: StageId;
  busy: boolean;
  canGenerate: boolean;
}) {
  const [question, setQuestion] = useState("");
  const active = ai.operations.some(operationActive);
  const history = ai.helpHistory
    .filter((help) => help.taskId === taskId)
    .slice(-5);
  const latest = [...ai.operations]
    .reverse()
    .find(
      (operation) =>
        operation.kind === "help" &&
        operation.taskId === taskId &&
        operation.status === "SUCCEEDED" &&
        operation.result?.kind === "help",
    );
  const latestAttempt = [...ai.operations]
    .reverse()
    .find(
      (operation) => operation.kind === "help" && operation.taskId === taskId,
    );
  const answer = latest?.result?.kind === "help" ? latest.result.answer : null;
  return (
    <section className="mt-5 border-t pt-5" aria-label="Task help">
      <h4 className="text-sm font-semibold">Need help with this task?</h4>
      <p className="mt-1 text-xs text-muted-foreground">
        Optional AI help for explanations and troubleshooting. Answers never
        mark tasks complete.
      </p>
      <label className="mt-3 block space-y-2 text-sm font-medium">
        Question about this task
        <textarea
          rows={2}
          maxLength={3000}
          className={inputStyle}
          value={question}
          disabled={busy || active}
          onChange={(event) => setQuestion(event.target.value)}
        />
      </label>
      <Button
        className="mt-3 min-h-11"
        disabled={busy || active || !question.trim() || !onStartOperation}
        onClick={() =>
          onStartOperation?.({
            kind: "help",
            stage,
            taskId,
            message: question.trim(),
          })
        }
      >
        Ask for help
      </Button>
      {latestAttempt?.status === "FAILED" ? (
        <p role="alert" className="mt-3 text-sm text-destructive">
          {latestAttempt.error ?? "Could not answer this question."} Edit your
          question or ask again.
        </p>
      ) : null}
      {latestAttempt?.status === "CANCELLED" ? (
        <p role="status" className="mt-3 text-sm text-muted-foreground">
          Help cancelled. You can ask again.
        </p>
      ) : null}
      {history.length || answer ? (
        <div className="mt-4 space-y-4" aria-label="Recent task help">
          {history.map((help, index) => (
            <div
              className="rounded-md bg-muted/40 p-3 text-sm"
              key={`${help.at}-${index}`}
            >
              <p className="font-medium">{help.question}</p>
              <p className="mt-2 whitespace-pre-wrap leading-relaxed">
                {help.answer}
              </p>
            </div>
          ))}
          {answer && !history.some((help) => help.answer === answer) ? (
            <p className="whitespace-pre-wrap rounded-md bg-muted/40 p-3 text-sm leading-relaxed">
              {answer}
            </p>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
