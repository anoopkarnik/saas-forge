// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Release } from "@/lib/scaffold/release-notes";

// An in-memory ReleaseEmail table with the real primary key (userId, version).
const { sentRows, db, RELEASE } = vi.hoisted(() => {
  const sentRows = new Set<string>();
  const RELEASE: Release = {
    version: "1.4.0",
    date: "2026-10-01",
    highlights: ["Safer payments"],
    entries: [
      {
        module: "billing",
        type: "security",
        title: "Verify Stripe webhook signatures",
      },
    ],
  };
  const db = {
    releaseEmailSubscription: {
      findMany: vi.fn(async () => [
        { user: { id: "owner-behind", email: "behind@example.com" } },
        { user: { id: "owner-current", email: "current@example.com" } },
        { user: { id: "owner-unaffected", email: "unaffected@example.com" } },
      ]),
    },
    releaseEmail: {
      create: vi.fn(
        async ({ data }: { data: { userId: string; version: string } }) => {
          const key = `${data.userId}@${data.version}`;
          if (sentRows.has(key))
            throw Object.assign(new Error("Unique constraint failed"), {
              code: "P2002",
            });
          sentRows.add(key);
        },
      ),
      delete: vi.fn(
        async ({
          where,
        }: {
          where: { userId_version: { userId: string; version: string } };
        }) => {
          sentRows.delete(
            `${where.userId_version.userId}@${where.userId_version.version}`,
          );
        },
      ),
    },
  };
  return { sentRows, db, RELEASE };
});
vi.mock("@workspace/database/client", () => ({ default: db }));
vi.mock("@workspace/email/resend/release", () => ({
  sendReleaseEmail: vi.fn(),
}));
vi.mock("@/lib/scaffold/template-version", () => ({
  getTemplateVersion: () => "1.4.0",
}));
vi.mock("@/lib/scaffold/project-service", () => ({
  listProjectsForOwners: vi.fn(async () => [
    // Behind, and the release changes billing: emailed.
    {
      userId: "owner-behind",
      name: "Shop",
      modules: ["billing"],
      templateVersion: "1.3.0",
    },
    // Already on the release: nothing new.
    {
      userId: "owner-current",
      name: "Fresh",
      modules: ["billing"],
      templateVersion: "1.4.0",
    },
    // Behind, but the release only touches billing: nothing for them.
    {
      userId: "owner-unaffected",
      name: "Chat",
      modules: ["ai"],
      templateVersion: "1.3.0",
    },
    // Not subscribed: never looked at.
    {
      userId: "owner-silent",
      name: "Quiet",
      modules: ["billing"],
      templateVersion: "1.3.0",
    },
  ]),
}));
vi.mock("@/lib/scaffold/releases", () => ({ loadReleases: () => [RELEASE] }));

import {
  ReleaseNotFoundError,
  sendReleaseEmails,
} from "@/lib/scaffold/release-emails";

describe("sendReleaseEmails", () => {
  beforeEach(() => sentRows.clear());

  it("emails each opted-in owner the release changes exactly once", async () => {
    const send = vi.fn(async () => true);

    expect(await sendReleaseEmails("1.4.0", send)).toEqual({
      sent: 1,
      skipped: 2,
      failed: 0,
    });
    expect(await sendReleaseEmails("1.4.0", send)).toEqual({
      sent: 0,
      skipped: 3,
      failed: 0,
    });

    expect(send).toHaveBeenCalledTimes(1);
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "behind@example.com",
        version: "1.4.0",
        projects: [{ name: "Shop", entries: RELEASE.entries }],
      }),
    );
  });

  it("retries an owner whose email failed", async () => {
    const send = vi.fn(async () => false);
    expect(await sendReleaseEmails("1.4.0", send)).toEqual({
      sent: 0,
      skipped: 2,
      failed: 1,
    });

    send.mockResolvedValue(true);
    expect(await sendReleaseEmails("1.4.0", send)).toEqual({
      sent: 1,
      skipped: 2,
      failed: 0,
    });
  });

  it("refuses a version without published notes", async () => {
    await expect(sendReleaseEmails("9.9.9", vi.fn())).rejects.toBeInstanceOf(
      ReleaseNotFoundError,
    );
  });
});
