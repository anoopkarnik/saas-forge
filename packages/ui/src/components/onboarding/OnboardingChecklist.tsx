"use client";

import * as React from "react";
import { CheckCircle2, Circle, X } from "lucide-react";
import { Button } from "@workspace/ui/components/shadcn/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/shadcn/card";
import { Progress } from "@workspace/ui/components/shadcn/progress";

export type OnboardingChecklistTask = {
  key: string;
  title: string;
  description: string;
  href: string | null;
  hint: string | null;
  done: boolean;
  /** Completed by the user clicking through, not derived from data. */
  manual: boolean;
};

/** The setup checklist card (onboarding module). Presentational. */
export function OnboardingChecklist({
  tasks,
  onDismiss,
  onComplete,
}: {
  tasks: OnboardingChecklistTask[];
  onDismiss: () => void;
  onComplete: (taskKey: string) => void;
}) {
  const done = tasks.filter((task) => task.done).length;
  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between space-y-0">
        <div>
          <CardTitle>Get set up</CardTitle>
          <CardDescription>
            {done} of {tasks.length} done
          </CardDescription>
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onDismiss}>
          <X className="h-4 w-4" />
          <span className="sr-only">Hide checklist</span>
        </Button>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <Progress value={tasks.length ? (done / tasks.length) * 100 : 0} />
        <ul className="flex flex-col gap-3">
          {tasks.map((task) => (
            <li key={task.key} className="flex items-start gap-3">
              {task.done ? (
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
              ) : (
                <Circle className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
              )}
              <div className="flex flex-1 flex-col">
                <span className={task.done ? "text-sm text-muted-foreground line-through" : "text-sm font-medium"}>{task.title}</span>
                <span className="text-xs text-muted-foreground">
                  {task.description}
                  {task.hint ? ` ${task.hint}.` : null}
                </span>
              </div>
              {!task.done && task.href ? (
                <Button asChild size="sm" variant="outline" className="h-7 text-xs">
                  <a href={task.href} onClick={() => task.manual && onComplete(task.key)}>
                    Open
                  </a>
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
