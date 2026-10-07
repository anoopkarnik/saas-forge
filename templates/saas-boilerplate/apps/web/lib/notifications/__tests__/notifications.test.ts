// @vitest-environment node
/* eslint-disable @typescript-eslint/no-explicit-any -- loose in-memory Prisma fakes */
import { beforeEach, describe, expect, it, vi } from "vitest";

// In-memory Notification and NotificationPreference tables with their real unique keys.
const { db, store, sendNotificationEmail } = vi.hoisted(() => {
  const store = { rows: [] as any[], prefs: new Map<string, boolean>(), user: { creditsTotal: 100, creditsUsed: 0 } };
  const matches = (row: any, where: any): boolean =>
    Object.entries(where).every(([key, value]: [string, any]) => {
      if (key === "OR") return value.some((part: any) => matches(row, part));
      return row[key] === value;
    });
  const db = {
    notification: {
      createMany: vi.fn(async ({ data }: any) => {
        let count = 0;
        for (const item of data) {
          if (item.dedupeKey && store.rows.some((row) => row.userId === item.userId && row.dedupeKey === item.dedupeKey)) continue;
          store.rows.push({ id: `n${store.rows.length + 1}`, readAt: null, createdAt: new Date(), ...item });
          count++;
        }
        return { count };
      }),
      findMany: vi.fn(async ({ where }: any) => store.rows.filter((row) => matches(row, where))),
      count: vi.fn(async ({ where }: any) => store.rows.filter((row) => matches(row, where)).length),
      updateMany: vi.fn(async ({ where, data }: any) => {
        const hit = store.rows.filter((row) => matches(row, where));
        hit.forEach((row) => Object.assign(row, data));
        return { count: hit.length };
      }),
    },
    notificationPreference: {
      findMany: vi.fn(async ({ where }: any) =>
        [...store.prefs]
          .map(([key, enabled]) => {
            const [userId, type, channel] = key.split("|");
            return { userId, type, channel, enabled };
          })
          .filter((row) => row.userId === where.userId && (!where.type || row.type === where.type)),
      ),
      upsert: vi.fn(async ({ where, create }: any) => {
        const { userId, type, channel } = where.userId_type_channel;
        store.prefs.set(`${userId}|${type}|${channel}`, create.enabled);
      }),
    },
    user: {
      findUnique: vi.fn(async () => ({ email: "ada@example.com", ...store.user })),
    },
  };
  return { db, store, sendNotificationEmail: vi.fn(async () => ({ data: { id: "e1" }, error: null })) };
});
vi.mock("@workspace/database/client", () => ({ default: db }));
vi.mock("@workspace/email/resend/notification", () => ({ sendNotificationEmail }));
vi.mock("@workspace/auth/better-auth/auth", () => ({ auth: { api: { getSession: vi.fn() } } }));
// scaffold:begin multi_tenancy
vi.mock("@/trpc/org", () => ({ getActiveOrganizationId: vi.fn(async () => "org1") }));
// scaffold:end multi_tenancy

import { invitationSent } from "@/lib/notifications/catalog";
import { notify } from "@/lib/notifications/notify";
import { notificationRouter } from "@/trpc/routers/notificationProcedures";

const caller = (role = "user") =>
  notificationRouter.createCaller({
    headers: new Headers(),
    session: { user: { id: "u1", role, email: "ada@example.com", name: "Ada" }, session: { id: "s1" } },
  } as never);

beforeEach(() => {
  store.rows.length = 0;
  store.prefs.clear();
  store.user = { creditsTotal: 100, creditsUsed: 0 };
  vi.clearAllMocks();
});

describe("notify", () => {
  it("writes the in-app row and emails on the channels a user keeps on", async () => {
    await caller().preferences.set({ type: "invitation.sent", channel: "email", enabled: true });

    expect(await notify(invitationSent, "u1", { email: "bob@example.com" })).toBe(true);

    expect(store.rows).toEqual([expect.objectContaining({ userId: "u1", type: "invitation.sent", title: "Invitation sent" })]);
    expect(sendNotificationEmail).toHaveBeenCalledWith(
      expect.objectContaining({ email: "ada@example.com", title: "Invitation sent", link: "http://localhost:3000/admin/users" }),
    );
  });

  it("turning email off stops the email but keeps the in-app notification", async () => {
    await caller().preferences.set({ type: "invitation.sent", channel: "email", enabled: false });
    await notify(invitationSent, "u1", { email: "bob@example.com" });

    expect(store.rows).toHaveLength(1);
    expect(sendNotificationEmail).not.toHaveBeenCalled();
  });

  it("notifies once per dedupe key (webhook retries)", async () => {
    expect(await notify(invitationSent, "u1", { email: "bob@example.com" }, { dedupeKey: "k1" })).toBe(true);
    expect(await notify(invitationSent, "u1", { email: "bob@example.com" }, { dedupeKey: "k1" })).toBe(false);
    expect(store.rows).toHaveLength(1);
  });
});

describe("notification router", () => {
  it("counts unread and updates after markRead and markAllRead", async () => {
    await notify(invitationSent, "u1", { email: "a@example.com" });
    await notify(invitationSent, "u1", { email: "b@example.com" });
    expect(await caller().unreadCount()).toBe(2);

    const [first] = await caller().list();
    await caller().markRead({ id: first!.id });
    expect(await caller().unreadCount()).toBe(1);

    await caller().markAllRead();
    expect(await caller().unreadCount()).toBe(0);
  });

  it("lets guests read the inbox but not mark it read", async () => {
    await notify(invitationSent, "u1", { email: "a@example.com" });
    expect(await caller("guest").unreadCount()).toBe(1);
    await expect(caller("guest").markAllRead()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("lists every type with its default channels", async () => {
    const preferences = await caller().preferences.get();
    expect(preferences).toEqual(
      expect.arrayContaining([
        { type: "invitation.sent", label: "Invitation sent", channels: { in_app: true, email: false } },
      ]),
    );
    await expect(caller().preferences.set({ type: "nope", channel: "email", enabled: true })).rejects.toMatchObject({
      code: "BAD_REQUEST",
    });
  });

  // scaffold:begin multi_tenancy
  it("shows personal notifications and the active organization's, not other organizations'", async () => {
    await notify(invitationSent, "u1", { email: "personal@example.com" });
    await notify(invitationSent, "u1", { email: "org1@example.com" }, { organizationId: "org1" });
    await notify(invitationSent, "u1", { email: "org2@example.com" }, { organizationId: "org2" });

    const bodies = (await caller().list()).map((item) => item.body);
    expect(bodies).toHaveLength(2);
    expect(bodies.join(" ")).not.toContain("org2@");
  });
  // scaffold:end multi_tenancy
});

// scaffold:begin ai
describe("credits running low", () => {
  it("notifies once when a charge crosses the threshold", async () => {
    const { notifyIfCreditsLow } = await import("@/lib/notifications/notify");

    store.user = { creditsTotal: 100, creditsUsed: 85 };
    await notifyIfCreditsLow("u1", 5); // 20 -> 15: above the threshold
    store.user = { creditsTotal: 100, creditsUsed: 92 };
    await notifyIfCreditsLow("u1", 7); // 15 -> 8: crosses it
    store.user = { creditsTotal: 100, creditsUsed: 95 };
    await notifyIfCreditsLow("u1", 3); // already below

    expect(store.rows.map((row) => row.type)).toEqual(["credits.low"]);
  });
});
// scaffold:end ai
