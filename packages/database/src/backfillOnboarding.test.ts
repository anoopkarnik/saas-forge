import { describe, expect, it, vi } from "vitest";
import { backfillOnboarding } from "./backfillOnboarding";

describe("backfillOnboarding", () => {
  it("marks onboarding as seen for users without a state, and is a no-op when there are none", async () => {
    const now = new Date("2026-10-07T00:00:00Z");
    const createMany = vi.fn(async ({ data }: { data: unknown[] }) => ({ count: data.length }));
    const prisma = {
      user: { findMany: vi.fn(async () => [{ id: "u1" }, { id: "u2" }]) },
      onboardingState: { createMany },
    };

    expect(await backfillOnboarding(prisma as never, now)).toBe(2);
    expect(createMany).toHaveBeenCalledWith({
      data: [
        { userId: "u1", wizardDoneAt: now, checklistDismissedAt: now },
        { userId: "u2", wizardDoneAt: now, checklistDismissedAt: now },
      ],
      skipDuplicates: true,
    });

    prisma.user.findMany.mockResolvedValueOnce([]);
    expect(await backfillOnboarding(prisma as never, now)).toBe(0);
  });
});
