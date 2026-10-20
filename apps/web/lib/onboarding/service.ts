import type { Prisma } from "@workspace/database/prisma";
import db from "@workspace/database/client";
import { getSiteConfig } from "@/lib/site-config/service";
import { findTask, ONBOARDING_TASKS } from "@/lib/onboarding/tasks";

export const WIZARD_STEPS = 3;

export class OnboardingTaskError extends Error {}

export type OnboardingView = {
  showWizard: boolean;
  step: number;
  answers: Record<string, string>;
  /** Null when hidden (dismissed, turned off in settings or by flag). */
  checklist: {
    tasks: Array<{ key: string; title: string; description: string; href: string | null; hint: string | null; done: boolean; manual: boolean }>;
    done: number;
    total: number;
  } | null;
  checklistDismissed: boolean;
};

/** The first call creates the user's state, which is what shows the wizard once. Never blocks anything. */
export async function getOnboarding(userId: string, { checklistFlag = true }: { checklistFlag?: boolean } = {}): Promise<OnboardingView> {
  const state = await db.onboardingState.upsert({ where: { userId }, create: { userId }, update: {} });
  const config = await getSiteConfig();
  const showChecklist = config["onboarding.checklist"] && checklistFlag && !state.checklistDismissedAt;

  let checklist: OnboardingView["checklist"] = null;
  if (showChecklist) {
    const stored = new Set(
      (await db.onboardingTask.findMany({ where: { userId }, select: { taskKey: true } })).map((row) => row.taskKey),
    );
    const tasks = await Promise.all(
      ONBOARDING_TASKS.map(async (task) => ({
        key: task.key,
        title: task.title,
        description: task.description,
        href: task.href ?? null,
        hint: task.hint ?? null,
        manual: !task.done,
        done: task.done ? await task.done(userId) : stored.has(task.key),
      })),
    );
    checklist = { tasks, done: tasks.filter((task) => task.done).length, total: tasks.length };
  }

  return {
    showWizard: config["onboarding.wizard"] && !state.wizardDoneAt,
    step: state.step,
    answers: (state.answers ?? {}) as Record<string, string>,
    checklist,
    checklistDismissed: !!state.checklistDismissedAt,
  };
}

/** Saves wizard answers; `finish` (or skipping) closes the wizard until it is reopened. */
export async function saveAnswers(userId: string, input: { step: number; answers: Record<string, string>; finish: boolean }) {
  const state = await db.onboardingState.upsert({ where: { userId }, create: { userId }, update: {} });
  await db.onboardingState.update({
    where: { userId },
    data: {
      step: Math.min(Math.max(input.step, 0), WIZARD_STEPS),
      answers: { ...((state.answers ?? {}) as Record<string, string>), ...input.answers } as Prisma.InputJsonValue,
      ...(input.finish ? { wizardDoneAt: new Date() } : {}),
    },
  });
}

export async function setWizardOpen(userId: string, open: boolean) {
  await db.onboardingState.upsert({
    where: { userId },
    create: { userId, wizardDoneAt: open ? null : new Date() },
    update: open ? { wizardDoneAt: null, step: 0 } : { wizardDoneAt: new Date() },
  });
}

export async function setChecklistDismissed(userId: string, dismissed: boolean) {
  const checklistDismissedAt = dismissed ? new Date() : null;
  await db.onboardingState.upsert({ where: { userId }, create: { userId, checklistDismissedAt }, update: { checklistDismissedAt } });
}

/** Only for tasks with no data to derive completion from. */
export async function completeTask(userId: string, taskKey: string) {
  const task = findTask(taskKey);
  if (!task) throw new OnboardingTaskError("Unknown task.");
  if (task.done) throw new OnboardingTaskError("This task completes on its own.");
  await db.onboardingTask.createMany({ data: [{ userId, taskKey }], skipDuplicates: true });
}
