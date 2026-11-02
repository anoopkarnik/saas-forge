import { describe, expect, it } from "vitest";
import { audit, userActor } from "./audit";

describe("audit request detail configuration", () => {
  it("writes to the supplied transaction without reading request details when disabled", async () => {
    const rows: unknown[] = [];
    const transaction = {
      auditEvent: {
        create: async ({ data }: { data: unknown }) => {
          rows.push(data);
        },
      },
    };
    const headers = {
      get: () => {
        throw new Error("Disabled request details must not be read");
      },
    };

    await audit(
      transaction as never,
      "user.role_changed",
      {
        actor: userActor("admin-1"),
        targetId: "user-2",
        metadata: { role: "admin" },
        headers,
      },
      { recordRequestDetails: false },
    );

    expect(rows).toEqual([
      {
        action: "user.role_changed",
        targetType: "user",
        targetId: "user-2",
        organizationId: null,
        actorType: "user",
        actorUserId: "admin-1",
        actorApiKeyId: null,
        metadata: { role: "admin" },
        ip: null,
        userAgent: null,
      },
    ]);
  });

  it("records supplied request details when explicitly enabled", async () => {
    const rows: unknown[] = [];
    const transaction = {
      auditEvent: {
        create: async ({ data }: { data: unknown }) => {
          rows.push(data);
        },
      },
    };

    await audit(
      transaction as never,
      "user.unbanned",
      {
        actor: userActor("admin-1"),
        metadata: {},
        headers: new Headers({
          "x-forwarded-for": "203.0.113.9, 10.0.0.1",
          "user-agent": "integration-client",
        }),
      },
      { recordRequestDetails: true },
    );

    expect(rows).toEqual([
      expect.objectContaining({
        ip: "203.0.113.9",
        userAgent: "integration-client",
      }),
    ]);
  });
});
