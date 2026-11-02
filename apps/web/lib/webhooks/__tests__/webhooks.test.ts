// @vitest-environment node
/* eslint-disable @typescript-eslint/no-explicit-any -- loose in-memory Prisma fakes */
import { beforeEach, describe, expect, it, vi } from "vitest";

// In-memory WebhookEndpoint / WebhookDelivery tables, a fake transport and a recording queue.
const { db, store, posts, enqueue, queue } = vi.hoisted(() => {
  const store = { endpoints: [] as any[], deliveries: [] as any[] };
  const queue = { inngest: true };
  const matches = (row: any, where: any): boolean =>
    Object.entries(where ?? {}).every(([key, value]: [string, any]) => {
      if (key === "OR") return value.some((part: any) => matches(row, part));
      if (key === "endpoint")
        return matches(
          store.endpoints.find((e) => e.id === row.endpointId),
          value,
        );
      if (value && typeof value === "object" && "has" in value)
        return row[key].includes(value.has);
      return row[key] === value;
    });
  let seq = 0;
  const table = (rows: () => any[], defaults: () => any) => ({
    create: vi.fn(async ({ data }: any) => {
      const row = {
        id: `id${++seq}`,
        createdAt: new Date(Date.now() + seq),
        ...defaults(),
        ...data,
      };
      rows().push(row);
      return row;
    }),
    findMany: vi.fn(async ({ where }: any = {}) =>
      rows()
        .filter((row) => matches(row, where))
        .reverse(),
    ),
    findFirst: vi.fn(
      async ({ where }: any) =>
        rows().find((row) => matches(row, where)) ?? null,
    ),
    findUnique: vi.fn(async ({ where, include }: any) => {
      const row = rows().find((r) => r.id === where.id);
      if (!row) return null;
      return include?.endpoint
        ? {
            ...row,
            endpoint: store.endpoints.find((e) => e.id === row.endpointId),
          }
        : row;
    }),
    update: vi.fn(async ({ where, data }: any) =>
      Object.assign(
        rows().find((r) => r.id === where.id),
        data,
      ),
    ),
    deleteMany: vi.fn(async ({ where }: any) => {
      const doomed = rows().filter((row) => matches(row, where));
      doomed.forEach((row) => rows().splice(rows().indexOf(row), 1));
      return { count: doomed.length };
    }),
  });
  const db: any = {
    webhookEndpoint: table(
      () => store.endpoints,
      () => ({
        enabled: true,
        consecutiveFailures: 0,
        disabledReason: null,
        previousSecretEncrypted: null,
        previousSecretExpiresAt: null,
        ownerUserId: null,
        organizationId: null,
      }),
    ),
    webhookDelivery: table(
      () => store.deliveries,
      () => ({ attempt: 0, status: "pending" }),
    ),
    $transaction: vi.fn(async (operations: Promise<unknown>[]) =>
      Promise.all(operations),
    ),
  };
  return {
    db,
    store,
    queue,
    posts: vi.fn(),
    enqueue: vi.fn(async () => undefined),
  };
});
vi.mock("@workspace/database/client", () => ({ default: db }));
vi.mock("@workspace/jobs/index", async (original) => ({
  ...(await original<object>()),
  enqueue,
}));
vi.mock("@workspace/jobs/inngest", () => ({
  inngestEnabled: () => queue.inngest,
}));
vi.mock("@workspace/webhooks/transport", () => ({ postWebhook: posts }));
vi.mock("@workspace/auth/better-auth/auth", () => ({
  auth: { api: { getSession: vi.fn() } },
}));
// scaffold:begin notifications
vi.mock("@workspace/notifications/notify", () => ({
  notify: vi.fn(async () => true),
}));
// scaffold:end notifications

import { attemptDelivery } from "@workspace/webhooks/deliver";
import { SIGNATURE_HEADER, verifySignature } from "@workspace/webhooks/signing";
import { webhookRouter } from "@/trpc/routers/webhookProcedures";

const PUBLIC_URL = "https://93.184.216.34/hooks";

const caller = (role = "user", userId = "u1") =>
  webhookRouter.createCaller({
    headers: new Headers(),
    session: {
      user: { id: userId, role, email: "a@example.com", name: "A" },
      session: { id: "s1" },
    },
  } as never);

beforeEach(() => {
  store.endpoints.length = 0;
  store.deliveries.length = 0;
  queue.inngest = true;
  vi.clearAllMocks();
  vi.stubEnv("WEBHOOK_SECRET_KEY", "test-only-webhook-key-0123456789abcdef");
  posts.mockResolvedValue({ status: 200 });
});

describe("webhook router", () => {
  it("rejects private URLs when an endpoint is created", async () => {
    for (const url of [
      "http://127.0.0.1/hook",
      "http://10.0.0.5/hook",
      "http://[::1]/hook",
      "http://169.254.169.254/latest",
    ]) {
      await expect(
        caller().create({ url, events: ["webhook.test"] }),
      ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    }
    expect(store.endpoints).toHaveLength(0);
  });

  it("returns the secret once, stores it encrypted and never lists it", async () => {
    const { secret } = await caller().create({
      url: PUBLIC_URL,
      events: ["webhook.test"],
    });
    expect(secret).toMatch(/^whsec_/);
    expect(JSON.stringify(store.endpoints)).not.toContain(secret);
    expect(JSON.stringify(await caller().list())).not.toContain(secret);
  });

  it("rejects unknown event types", async () => {
    await expect(
      caller().create({ url: PUBLIC_URL, events: ["nope.nope"] }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("guests can read but not create; others cannot touch someone's endpoint", async () => {
    await expect(
      caller("guest").create({ url: PUBLIC_URL, events: ["webhook.test"] }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(await caller("guest").list()).toEqual([]);
    const { endpoint } = await caller().create({
      url: PUBLIC_URL,
      events: ["webhook.test"],
    });
    await expect(
      caller("user", "u2").delete({ id: endpoint.id }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("sends a signed test event the documented check accepts", async () => {
    const { endpoint, secret } = await caller().create({
      url: PUBLIC_URL,
      events: ["webhook.test"],
    });
    const { deliveryId } = await caller().sendTest({ id: endpoint.id });
    await attemptDelivery(deliveryId);

    const [, body, headers] = posts.mock.calls[0]!;
    expect(
      verifySignature({ header: headers[SIGNATURE_HEADER], body, secret }),
    ).toBe(true);
    expect(JSON.parse(body)).toMatchObject({
      type: "webhook.test",
      apiVersion: expect.any(String),
      data: { message: expect.any(String) },
    });
    expect(store.deliveries[0]).toMatchObject({
      status: "succeeded",
      attempt: 1,
      responseCode: 200,
    });
  });

  it("after a rotation, deliveries carry signatures for the old and the new secret", async () => {
    const { endpoint, secret: oldSecret } = await caller().create({
      url: PUBLIC_URL,
      events: ["webhook.test"],
    });
    const { secret: newSecret } = await caller().rotateSecret({
      id: endpoint.id,
    });
    const { deliveryId } = await caller().sendTest({ id: endpoint.id });
    await attemptDelivery(deliveryId);
    const [, body, headers] = posts.mock.calls[0]!;
    expect(
      verifySignature({
        header: headers[SIGNATURE_HEADER],
        body,
        secret: newSecret,
      }),
    ).toBe(true);
    expect(
      verifySignature({
        header: headers[SIGNATURE_HEADER],
        body,
        secret: oldSecret,
      }),
    ).toBe(true);
  });

  it("replays a delivery with the same event id", async () => {
    const { endpoint } = await caller().create({
      url: PUBLIC_URL,
      events: ["webhook.test"],
    });
    const { deliveryId } = await caller().sendTest({ id: endpoint.id });
    const replay = await caller().replay({ deliveryId });
    expect(
      store.deliveries.find((d) => d.id === replay.deliveryId)!.eventId,
    ).toBe(store.deliveries[0]!.eventId);
  });
});
