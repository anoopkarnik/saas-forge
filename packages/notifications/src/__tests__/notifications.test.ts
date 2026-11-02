// @vitest-environment node
/* eslint-disable @typescript-eslint/no-explicit-any -- loose in-memory Prisma fakes */
import { beforeEach, describe, expect, it, vi } from "vitest";

// In-memory Notification and NotificationPreference tables with their real unique keys.
const { db, store, sendNotificationEmail } = vi.hoisted(() => {
  const store = {
    rows: [] as any[],
    prefs: new Map<string, boolean>(),
    user: { creditsTotal: 100, creditsUsed: 0 },
  };
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
          if (
            item.dedupeKey &&
            store.rows.some(
              (row) =>
                row.userId === item.userId && row.dedupeKey === item.dedupeKey,
            )
          )
            continue;
          store.rows.push({
            id: `n${store.rows.length + 1}`,
            readAt: null,
            createdAt: new Date(),
            ...item,
          });
          count++;
        }
        return { count };
      }),
      findMany: vi.fn(async ({ where }: any) =>
        store.rows.filter((row) => matches(row, where)),
      ),
      count: vi.fn(
        async ({ where }: any) =>
          store.rows.filter((row) => matches(row, where)).length,
      ),
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
          .filter(
            (row) =>
              row.userId === where.userId &&
              (!where.type || row.type === where.type),
          ),
      ),
      upsert: vi.fn(async ({ where, create }: any) => {
        const { userId, type, channel } = where.userId_type_channel;
        store.prefs.set(`${userId}|${type}|${channel}`, create.enabled);
      }),
    },
    user: {
      findUnique: vi.fn(async () => ({
        email: "ada@example.com",
        locale: "es",
        ...store.user,
      })),
    },
  };
  return {
    db,
    store,
    sendNotificationEmail: vi.fn(async () => ({
      data: { id: "e1" },
      error: null,
    })),
  };
});
vi.mock("@workspace/database/client", () => ({ default: db }));
vi.mock("@workspace/email/resend/notification", () => ({
  sendNotificationEmail,
}));

import { invitationSent } from "../catalog";
import { notify } from "../notify";
import { setPreference } from "../service";

beforeEach(() => {
  store.rows.length = 0;
  store.prefs.clear();
  store.user = { creditsTotal: 100, creditsUsed: 0 };
  vi.clearAllMocks();
});

describe("notify", () => {
  it("writes the in-app row and emails on the channels a user keeps on", async () => {
    await setPreference("u1", "invitation.sent", "email", true);

    expect(
      await notify(invitationSent, "u1", { email: "bob@example.com" }),
    ).toBe(true);

    expect(store.rows).toEqual([
      expect.objectContaining({
        userId: "u1",
        type: "invitation.sent",
        title: "Invitation sent",
      }),
    ]);
    expect(sendNotificationEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "ada@example.com",
        title: "Invitation sent",
        link: "http://localhost:3000/admin/users",
        locale: "es",
      }),
    );
  });

  it("turning email off stops the email but keeps the in-app notification", async () => {
    await setPreference("u1", "invitation.sent", "email", false);
    await notify(invitationSent, "u1", { email: "bob@example.com" });

    expect(store.rows).toHaveLength(1);
    expect(sendNotificationEmail).not.toHaveBeenCalled();
  });

  it("notifies once per dedupe key (webhook retries)", async () => {
    expect(
      await notify(
        invitationSent,
        "u1",
        { email: "bob@example.com" },
        { dedupeKey: "k1" },
      ),
    ).toBe(true);
    expect(
      await notify(
        invitationSent,
        "u1",
        { email: "bob@example.com" },
        { dedupeKey: "k1" },
      ),
    ).toBe(false);
    expect(store.rows).toHaveLength(1);
  });
});

// scaffold:begin ai
describe("credits running low", () => {
  it("notifies once when a charge crosses the threshold", async () => {
    const { notifyIfCreditsLow } = await import("../notify");

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
