// @vitest-environment node
/* eslint-disable @typescript-eslint/no-explicit-any -- loose in-memory Prisma fakes */
import { beforeEach, describe, expect, it, vi } from "vitest";

// In-memory onboarding tables plus the rows derived tasks read.
const { db, store, config, flag } = vi.hoisted(() => {
  const store = {
    states: new Map<string, any>(),
    tasks: [] as Array<{ userId: string; taskKey: string }>,
    user: { name: "Ada", image: null as string | null, emailVerified: false },
    counts: { invitations: 0, transactions: 0, conversations: 0, apiKeys: 0 },
  };
  const config = { "onboarding.wizard": true, "onboarding.checklist": true };
  const flag = { on: true };
  const db: any = {
    onboardingState: {
      upsert: vi.fn(async ({ where, create, update }: any) => {
        const row = store.states.get(where.userId);
        const next = row
          ? { ...row, ...update }
          : { step: 0, answers: {}, wizardDoneAt: null, checklistDismissedAt: null, ...create };
        store.states.set(where.userId, next);
        return next;
      }),
      update: vi.fn(async ({ where, data }: any) => {
        const next = { ...store.states.get(where.userId), ...data };
        store.states.set(where.userId, next);
        return next;
      }),
    },
    onboardingTask: {
      findMany: vi.fn(async ({ where }: any) => store.tasks.filter((t) => t.userId === where.userId)),
      createMany: vi.fn(async ({ data }: any) => {
        for (const row of data) if (!store.tasks.some((t) => t.userId === row.userId && t.taskKey === row.taskKey)) store.tasks.push(row);
        return { count: 1 };
      }),
    },
    user: { findUnique: vi.fn(async () => ({ ...store.user })) },
    organizationInvitation: { count: vi.fn(async () => store.counts.invitations) },
    transaction: { count: vi.fn(async () => store.counts.transactions) },
    aiConversation: { count: vi.fn(async () => store.counts.conversations) },
    apiKey: { count: vi.fn(async () => store.counts.apiKeys) },
  };
  return { db, store, config, flag };
});
vi.mock("@workspace/database/client", () => ({ default: db }));
vi.mock("@workspace/auth/better-auth/auth", () => ({ auth: { api: { getSession: vi.fn() } } }));
vi.mock("@/lib/site-config/service", () => ({ getSiteConfig: async () => ({ ...config }) }));
vi.mock("@/lib/flags/flags", () => ({ isEnabled: async () => flag.on, sessionSubject: async () => ({}) }));

import { ONBOARDING_TASKS } from "@/lib/onboarding/tasks";
import { onboardingRouter } from "@/trpc/routers/onboardingProcedures";

const caller = (role = "user") =>
  onboardingRouter.createCaller({
    headers: new Headers(),
    session: { user: { id: "u1", role, email: "ada@example.com", name: "Ada" }, session: { id: "s1" } },
  } as never);
const task = async (key: string) => (await caller().state()).checklist?.tasks.find((t) => t.key === key);

beforeEach(() => {
  store.states.clear();
  store.tasks.length = 0;
  store.user = { name: "Ada", image: null, emailVerified: false };
  store.counts = { invitations: 0, transactions: 0, conversations: 0, apiKeys: 0 };
  config["onboarding.wizard"] = true;
  config["onboarding.checklist"] = true;
  flag.on = true;
  vi.clearAllMocks();
});

describe("task registry", () => {
  it("lists exactly the tasks of the modules in this download", () => {
    expect(ONBOARDING_TASKS.map((t) => t.key)).toEqual([
      "profile.complete",
      "email.verify",
      "docs.read",
      // scaffold:begin multi_tenancy
      "team.invite",
      // scaffold:end multi_tenancy
      // scaffold:begin billing
      "credits.buy",
      // scaffold:end billing
      // scaffold:begin ai
      "ai.chat",
      // scaffold:end ai
      // scaffold:begin api_keys
      "api_key.create",
      // scaffold:end api_keys
    ]);
  });
});

describe("wizard", () => {
  it("shows once for a new user, can be skipped and taken again", async () => {
    expect((await caller().state()).showWizard).toBe(true);
    await caller().setWizard({ open: false });
    expect((await caller().state()).showWizard).toBe(false);
    await caller().setWizard({ open: true });
    expect((await caller().state())).toMatchObject({ showWizard: true, step: 0 });
  });

  it("keeps answers and closes when finished", async () => {
    await caller().answer({ step: 0, answers: { role: "Engineer" } });
    await caller().answer({ step: 3, answers: { useCase: "A side project" }, finish: true });
    const state = await caller().state();
    expect(state.showWizard).toBe(false);
    expect(state.answers).toEqual({ role: "Engineer", useCase: "A side project" });
  });

  it("is off when site config turns it off", async () => {
    config["onboarding.wizard"] = false;
    expect((await caller().state()).showWizard).toBe(false);
  });
});

describe("checklist", () => {
  it("setting an avatar completes the profile task with no explicit write", async () => {
    expect((await task("profile.complete"))?.done).toBe(false);
    store.user.image = "https://cdn.example/ada.png";
    expect((await task("profile.complete"))?.done).toBe(true);
    expect(db.onboardingTask.createMany).not.toHaveBeenCalled();
  });

  it("manual tasks are completed by the user; derived ones cannot be", async () => {
    await caller().complete({ taskKey: "docs.read" });
    expect((await task("docs.read"))?.done).toBe(true);
    await expect(caller().complete({ taskKey: "profile.complete" })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(caller().complete({ taskKey: "nope" })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  // scaffold:begin api_keys
  it("creating an API key completes its task", async () => {
    store.counts.apiKeys = 1;
    expect((await task("api_key.create"))?.done).toBe(true);
  });
  // scaffold:end api_keys

  it("is hidden when dismissed, turned off in settings or by its flag, and can come back", async () => {
    await caller().dismiss({ dismissed: true });
    expect(await caller().state()).toMatchObject({ checklist: null, checklistDismissed: true });
    await caller().dismiss({ dismissed: false });
    expect((await caller().state()).checklist).not.toBeNull();
    config["onboarding.checklist"] = false;
    expect((await caller().state()).checklist).toBeNull();
    config["onboarding.checklist"] = true;
    flag.on = false;
    expect((await caller().state()).checklist).toBeNull();
  });

  it("the demo guest sees neither and cannot write", async () => {
    expect(await caller("guest").state()).toMatchObject({ showWizard: false, checklist: null });
    expect(store.states.size).toBe(0);
    await expect(caller("guest").dismiss({ dismissed: true })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
