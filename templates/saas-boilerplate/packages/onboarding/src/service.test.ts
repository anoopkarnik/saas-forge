import { beforeEach, describe, expect, it, vi } from "vitest";

const { db, store, queries } = vi.hoisted(() => {
  const queries: string[] = [];
  const store = {
    state: {
      userId: "u1",
      step: 2,
      answers: { role: "Engineer" },
      wizardDoneAt: null as Date | null,
      checklistDismissedAt: null as Date | null,
    },
    tasks: [{ userId: "u1", taskKey: "docs.read" }],
  };
  const count = (table: string) => async () => {
    queries.push(table);
    return 0;
  };
  const db = {
    onboardingState: {
      upsert: async ({ update }: { update: Partial<typeof store.state> }) => {
        queries.push("onboardingState");
        Object.assign(store.state, update);
        return store.state;
      },
    },
    onboardingTask: {
      findMany: async () => {
        queries.push("onboardingTask");
        return store.tasks;
      },
    },
    user: {
      findUnique: async () => {
        queries.push("user");
        return { name: "Ada", image: "avatar.png", emailVerified: true };
      },
    },
    // scaffold:begin multi_tenancy
    organizationInvitation: { count: count("organizationInvitation") },
    // scaffold:end multi_tenancy
    // scaffold:begin billing
    transaction: { count: count("transaction") },
    // scaffold:end billing
    // scaffold:begin ai
    aiConversation: { count: count("aiConversation") },
    // scaffold:end ai
    // scaffold:begin api_keys
    apiKey: { count: count("apiKey") },
    // scaffold:end api_keys
  };
  return { db, store, queries };
});
vi.mock("@workspace/database/client", () => ({ default: db }));

import { getOnboarding } from "./service";

beforeEach(() => {
  queries.length = 0;
  store.state = {
    userId: "u1",
    step: 2,
    answers: { role: "Engineer" },
    wizardDoneAt: null,
    checklistDismissedAt: null,
  };
});

describe("injected onboarding visibility", () => {
  it.each([
    { wizardEnabled: false, checklistEnabled: false },
    { wizardEnabled: false, checklistFlag: false },
  ])(
    "hides disabled surfaces without querying tasks or losing saved progress: %j",
    async (options) => {
      const original = structuredClone(store.state);

      expect(await getOnboarding("u1", options)).toEqual({
        showWizard: false,
        step: 2,
        answers: { role: "Engineer" },
        checklist: null,
        checklistDismissed: false,
      });

      expect(queries).toEqual(["onboardingState"]);
      expect(store.state).toEqual(original);

      const restored = await getOnboarding("u1", {
        wizardEnabled: true,
        checklistEnabled: true,
        checklistFlag: true,
      });
      expect(restored).toMatchObject({
        showWizard: true,
        step: 2,
        answers: { role: "Engineer" },
      });
      expect(restored.checklist?.tasks).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            key: "docs.read",
            manual: true,
            done: true,
          }),
          expect.objectContaining({
            key: "profile.complete",
            manual: false,
            done: true,
          }),
        ]),
      );
    },
  );

  it("preserves completed wizard and dismissed checklist state when options are re-enabled", async () => {
    store.state.wizardDoneAt = new Date("2026-10-01T00:00:00Z");
    store.state.checklistDismissedAt = new Date("2026-10-02T00:00:00Z");
    const original = structuredClone(store.state);

    await getOnboarding("u1", {
      wizardEnabled: false,
      checklistEnabled: false,
    });
    expect(
      await getOnboarding("u1", {
        wizardEnabled: true,
        checklistEnabled: true,
      }),
    ).toMatchObject({
      showWizard: false,
      checklist: null,
      checklistDismissed: true,
      step: 2,
      answers: { role: "Engineer" },
    });
    expect(store.state).toEqual(original);
    expect(queries).toEqual(["onboardingState", "onboardingState"]);
  });
});
