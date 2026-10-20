import type { PrismaClient } from "./generated/prisma/client";

/**
 * Marks onboarding as already seen for every existing user (onboarding
 * module), so installing it does not show the wizard or checklist to people
 * who signed up before. Safe to run again: users with a state are skipped.
 * Returns how many users were marked.
 */
export async function backfillOnboarding(prisma: Pick<PrismaClient, "user" | "onboardingState">, now = new Date()): Promise<number> {
  const users = await prisma.user.findMany({ where: { onboardingState: null }, select: { id: true } });
  if (users.length === 0) return 0;
  const { count } = await prisma.onboardingState.createMany({
    data: users.map((user) => ({ userId: user.id, wizardDoneAt: now, checklistDismissedAt: now })),
    skipDuplicates: true,
  });
  return count;
}
