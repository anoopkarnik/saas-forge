import db from "@workspace/database/client";

/**
 * The setup checklist (onboarding module). Each module's tasks sit in its
 * marker region, so a download lists exactly the tasks it can fulfil.
 * Prefer a `done` check on real data; a task without one is completed by
 * `onboarding.complete` (stored in OnboardingTask).
 */
export type OnboardingTaskDefinition = {
  key: string;
  title: string;
  description: string;
  /** A page that does the task, or a hint where it lives (e.g. a settings tab). */
  href?: string;
  hint?: string;
  done?: (userId: string) => Promise<boolean>;
};

export const ONBOARDING_TASKS: OnboardingTaskDefinition[] = [
  {
    key: "profile.complete",
    title: "Add your name and a profile picture",
    description: "So teammates recognise you.",
    hint: "Settings → My Account",
    done: async (userId) => {
      const user = await db.user.findUnique({ where: { id: userId }, select: { name: true, image: true } });
      return !!user?.name?.trim() && !!user.image;
    },
  },
  {
    key: "email.verify",
    title: "Verify your email",
    description: "Use the link we emailed you when you signed up.",
    done: async (userId) => !!(await db.user.findUnique({ where: { id: userId }, select: { emailVerified: true } }))?.emailVerified,
  },
  {
    key: "docs.read",
    title: "Skim the documentation",
    description: "A few minutes to see what you can do.",
    href: "/landing/doc",
  },
  // scaffold:begin multi_tenancy
  {
    key: "team.invite",
    title: "Invite a teammate",
    description: "Work together in a shared workspace.",
    href: "/organization",
    done: async (userId) => (await db.organizationInvitation.count({ where: { inviterId: userId } })) > 0,
  },
  // scaffold:end multi_tenancy
  // scaffold:begin billing
  {
    key: "credits.buy",
    title: "Buy credits",
    description: "Top up before you run out.",
    hint: "Settings → Plans & Billing",
    done: async (userId) => (await db.transaction.count({ where: { userId } })) > 0,
  },
  // scaffold:end billing
  // scaffold:begin ai
  {
    key: "ai.chat",
    title: "Start an AI chat",
    description: "Ask the assistant anything.",
    href: "/ai",
    done: async (userId) => (await db.aiConversation.count({ where: { userId } })) > 0,
  },
  // scaffold:end ai
  // scaffold:begin api_keys
  {
    key: "api_key.create",
    title: "Create an API key",
    description: "Call the API from your own code.",
    hint: "Settings → API Keys",
    done: async (userId) => (await db.apiKey.count({ where: { userId } })) > 0,
  },
  // scaffold:end api_keys
];

export const findTask = (key: string) => ONBOARDING_TASKS.find((task) => task.key === key);
