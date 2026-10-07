// @vitest-environment node
/* eslint-disable @typescript-eslint/no-explicit-any -- loose in-memory Prisma fakes */
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

// In-memory AuditEvent table plus the rows org procedures and site config read.
const { db, events, config, getSession } = vi.hoisted(() => {
  const events: any[] = [];
  const config = { recordRequestDetails: true };
  const matches = (row: any, where: any): boolean =>
    Object.entries(where ?? {}).every(([key, value]: [string, any]) => {
      if (value && typeof value === "object" && !(value instanceof Date)) {
        if ("startsWith" in value) return String(row[key]).startsWith(value.startsWith);
        if ("in" in value) return value.in.includes(row[key]);
        if ("gte" in value || "lte" in value || "lt" in value) {
          return (!value.gte || row[key] >= value.gte) && (!value.lte || row[key] <= value.lte) && (!value.lt || row[key] < value.lt);
        }
      }
      return row[key] === value;
    });
  const sorted = () => [...events].sort((a, b) => b.occurredAt - a.occurredAt || (a.id < b.id ? 1 : -1));
  const db: any = {
    auditEvent: {
      create: vi.fn(async ({ data }: any) => {
        events.push({ id: `e${String(events.length + 1).padStart(3, "0")}`, occurredAt: data.occurredAt ?? new Date(), ...data });
      }),
      findMany: vi.fn(async ({ where, take, cursor, skip }: any) => {
        let rows = sorted().filter((row) => matches(row, where));
        if (cursor) rows = rows.slice(rows.findIndex((row) => row.id === cursor.id) + (skip ?? 0));
        return rows.slice(0, take);
      }),
      deleteMany: vi.fn(async ({ where }: any) => {
        const doomed = events.filter((row) => matches(row, where));
        doomed.forEach((row) => events.splice(events.indexOf(row), 1));
        return { count: doomed.length };
      }),
    },
    user: {
      findUnique: vi.fn(async ({ where }: any) => (where.email === "ada@example.com" ? { id: "u1" } : null)),
      findMany: vi.fn(async ({ where }: any) =>
        where.id.in.map((id: string) => ({ id, email: `${id}@example.com` })),
      ),
    },
    session: { findUnique: vi.fn(async () => ({ activeOrganizationId: "org1" })) },
    member: { findUnique: vi.fn(async () => ({ role: "admin" })) },
  };
  return { db, events, config, getSession: vi.fn() };
});
vi.mock("@workspace/database/client", () => ({ default: db }));
vi.mock("@/lib/site-config/service", () => ({
  getSiteConfig: async () => ({ "audit.recordRequestDetails": config.recordRequestDetails, "audit.retentionDays": 365 }),
}));
vi.mock("@workspace/auth/better-auth/auth", () => ({ auth: { api: { getSession } } }));

import { audit, userActor } from "@/lib/audit/audit";
import { withAuthAudit } from "@/lib/audit/auth-events";
import { deleteAuditEventsOlderThan, exportAuditCsv } from "@/lib/audit/service";
import { auditRouter } from "@/trpc/routers/auditProcedures";

const CANARY = "canary-secret-7f3a";

const caller = (role: string) =>
  auditRouter.createCaller({
    headers: new Headers(),
    session: { user: { id: "u1", role, email: "ada@example.com", name: "Ada" }, session: { id: "s1" } },
  } as never);

beforeEach(() => {
  events.length = 0;
  config.recordRequestDetails = true;
  vi.clearAllMocks();
});

describe("audit()", () => {
  it("records actor, target and the request's IP and user agent", async () => {
    await audit(db, "user.role_changed", {
      actor: userActor("u1"),
      targetId: "u2",
      metadata: { role: "admin" },
      headers: new Headers({ "x-forwarded-for": "203.0.113.9, 10.0.0.1", "user-agent": "vitest" }),
    });
    expect(events).toEqual([
      expect.objectContaining({
        action: "user.role_changed",
        actorType: "user",
        actorUserId: "u1",
        targetType: "user",
        targetId: "u2",
        metadata: { role: "admin" },
        ip: "203.0.113.9",
        userAgent: "vitest",
      }),
    ]);
  });

  it("leaves IP and user agent out when site config turns them off", async () => {
    config.recordRequestDetails = false;
    await audit(db, "user.unbanned", {
      actor: userActor("u1"),
      targetId: "u2",
      metadata: {},
      headers: new Headers({ "x-forwarded-for": "203.0.113.9" }),
    });
    expect(events[0]).toMatchObject({ ip: null, userAgent: null });
  });

  it("never stores a redacted or secret-looking value", async () => {
    await audit(db, "user.password_set", { actor: userActor("u1"), targetId: "u2", metadata: { newPassword: CANARY } as never });
    await audit(db, "site_config.updated", {
      actor: userActor("u1"),
      metadata: { changes: { "branding.saasName": "Acme", nested: { apiToken: CANARY } } },
    });
    // scaffold:begin api_keys
    await audit(db, "api_key.created", {
      actor: userActor("u1"),
      targetId: "k1",
      metadata: { label: "ci", keyPrefix: "sk_live_ab", scopes: ["read"], plaintext: CANARY } as never,
    });
    // scaffold:end api_keys
    expect(JSON.stringify(events)).not.toContain(CANARY);
    expect(events[1].metadata.changes["branding.saasName"]).toBe("Acme");
  });

  it("an API key actor keeps its key id", async () => {
    await audit(db, "user.updated", {
      actor: { type: "apiKey", apiKeyId: "k1", userId: "u1" },
      targetId: "u1",
      metadata: { fields: ["name"] },
    });
    expect(events[0]).toMatchObject({ actorType: "apiKey", actorApiKeyId: "k1", actorUserId: "u1" });
  });
});

describe("Better Auth admin requests", () => {
  const request = (path: string, body: object) =>
    new NextRequest(`http://localhost:3000/api/auth${path}`, {
      method: "POST",
      body: JSON.stringify(body),
      headers: { "content-type": "application/json" },
    });

  it("records a role change made by the signed-in admin once it succeeds", async () => {
    getSession.mockResolvedValue({ user: { id: "admin1" } });
    const run = vi.fn(async (req: NextRequest) => {
      await req.json(); // Better Auth reads the body itself
      return Response.json({ user: { id: "u2" } });
    });

    const response = await withAuthAudit(request("/admin/set-role", { userId: "u2", role: "admin" }), run);

    expect(response.status).toBe(200);
    expect(events).toEqual([
      expect.objectContaining({ action: "user.role_changed", actorUserId: "admin1", targetId: "u2", metadata: { role: "admin" } }),
    ]);
  });

  it("records nothing when the change failed", async () => {
    getSession.mockResolvedValue({ user: { id: "admin1" } });
    await withAuthAudit(request("/admin/ban-user", { userId: "u2" }), async () => new Response("no", { status: 403 }));
    expect(events).toHaveLength(0);
  });

  it("keeps the new password out of the trail", async () => {
    getSession.mockResolvedValue({ user: { id: "admin1" } });
    await withAuthAudit(request("/admin/set-user-password", { userId: "u2", newPassword: CANARY }), async () =>
      Response.json({ status: true }),
    );
    expect(events).toHaveLength(1);
    expect(JSON.stringify(events)).not.toContain(CANARY);
  });
});

describe("audit router", () => {
  beforeEach(async () => {
    await audit(db, "doc.deleted", { actor: userActor("u1"), targetId: "d1", metadata: {} });
    // scaffold:begin multi_tenancy
    await audit(db, "org.member.removed", { actor: userActor("u2"), targetId: "m1", organizationId: "org1", metadata: {} });
    await audit(db, "org.member.removed", { actor: userActor("u3"), targetId: "m2", organizationId: "org2", metadata: {} });
    // scaffold:end multi_tenancy
  });

  it("admins see every event, newest first, with the actor's email", async () => {
    const { items } = await caller("admin").list({});
    expect(items.length).toBe(events.length);
    expect(items[0]!.actorEmail).toMatch(/@example\.com$/);
  });

  it("filters by actor email and action prefix", async () => {
    const byActor = await caller("admin").list({ actor: "ada@example.com" });
    expect(byActor.items.every((item) => item.actorUserId === "u1")).toBe(true);
    const docs = await caller("admin").list({ actionPrefix: "doc." });
    expect(docs.items.map((item) => item.action)).toEqual(["doc.deleted"]);
    expect((await caller("admin").list({ actor: "nobody@example.com" })).items).toEqual([]);
  });

  it("pages with a cursor", async () => {
    const first = await caller("admin").list({ limit: 1 });
    expect(first.items).toHaveLength(1);
    if (events.length > 1) {
      const second = await caller("admin").list({ limit: 1, cursor: first.nextCursor! });
      expect(second.items[0]!.id).not.toBe(first.items[0]!.id);
    }
  });

  it("is admin-only, even for reading", async () => {
    await expect(caller("guest").list({})).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller("user").exportCsv({})).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  // scaffold:begin multi_tenancy
  it("organization admins see only their organization's events", async () => {
    const { items } = await caller("user").orgActivity({});
    expect(items.map((item) => item.organizationId)).toEqual(["org1"]);
  });

  it("organization members below admin cannot", async () => {
    db.member.findUnique.mockResolvedValueOnce({ role: "member" });
    await expect(caller("user").orgActivity({})).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
  // scaffold:end multi_tenancy
});

describe("export and retention", () => {
  it("exports CSV with formula-looking cells neutralised", async () => {
    await audit(db, "user.created", { actor: userActor("u1"), targetId: "=HYPERLINK(1)", metadata: { email: "a@example.com" } });
    const { csv, truncated } = await exportAuditCsv({});
    expect(truncated).toBe(false);
    expect(csv.split("\n")[0]).toContain("occurredAt,action");
    expect(csv).toContain(`"'=HYPERLINK(1)"`);
  });

  it("deletes events older than the retention period; 0 keeps everything", async () => {
    const now = new Date("2026-10-07T00:00:00Z");
    await db.auditEvent.create({ data: { action: "doc.deleted", occurredAt: new Date("2025-01-01T00:00:00Z") } });
    await db.auditEvent.create({ data: { action: "doc.deleted", occurredAt: new Date("2026-10-01T00:00:00Z") } });

    expect(await deleteAuditEventsOlderThan(0, now)).toBe(0);
    expect(await deleteAuditEventsOlderThan(365, now)).toBe(1);
    expect(events).toHaveLength(1);
  });
});
