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
      if (key === "endpoint") return matches(store.endpoints.find((e) => e.id === row.endpointId), value);
      if (value && typeof value === "object" && "has" in value) return row[key].includes(value.has);
      return row[key] === value;
    });
  let seq = 0;
  const table = (rows: () => any[], defaults: () => any) => ({
    create: vi.fn(async ({ data }: any) => {
      const row = { id: `id${++seq}`, createdAt: new Date(Date.now() + seq), ...defaults(), ...data };
      rows().push(row);
      return row;
    }),
    findMany: vi.fn(async ({ where }: any = {}) => rows().filter((row) => matches(row, where)).reverse()),
    findFirst: vi.fn(async ({ where }: any) => rows().find((row) => matches(row, where)) ?? null),
    findUnique: vi.fn(async ({ where, include }: any) => {
      const row = rows().find((r) => r.id === where.id);
      if (!row) return null;
      return include?.endpoint ? { ...row, endpoint: store.endpoints.find((e) => e.id === row.endpointId) } : row;
    }),
    update: vi.fn(async ({ where, data }: any) => Object.assign(rows().find((r) => r.id === where.id), data)),
    deleteMany: vi.fn(async ({ where }: any) => {
      const doomed = rows().filter((row) => matches(row, where));
      doomed.forEach((row) => rows().splice(rows().indexOf(row), 1));
      return { count: doomed.length };
    }),
  });
  const db: any = {
    webhookEndpoint: table(() => store.endpoints, () => ({
      enabled: true,
      consecutiveFailures: 0,
      disabledReason: null,
      previousSecretEncrypted: null,
      previousSecretExpiresAt: null,
      ownerUserId: null,
      organizationId: null,
    })),
    webhookDelivery: table(() => store.deliveries, () => ({ attempt: 0, status: "pending" })),
    $transaction: vi.fn(async (operations: Promise<unknown>[]) => Promise.all(operations)),
  };
  return { db, store, queue, posts: vi.fn(), enqueue: vi.fn(async () => undefined) };
});
vi.mock("@workspace/database/client", () => ({ default: db }));
vi.mock("@workspace/jobs/index", async (original) => ({ ...(await original<object>()), enqueue }));
vi.mock("@workspace/jobs/inngest", () => ({ inngestEnabled: () => queue.inngest }));
vi.mock("@/lib/webhooks/transport", () => ({ postWebhook: posts }));
vi.mock("@workspace/auth/better-auth/auth", () => ({ auth: { api: { getSession: vi.fn() } } }));
// scaffold:begin notifications
vi.mock("@/lib/notifications/notify", () => ({ notify: vi.fn(async () => true) }));
// scaffold:end notifications

import { attemptDelivery, DISABLE_AFTER_FAILURES, RETRY_DELAYS_MS } from "@/lib/webhooks/deliver";
import { emitWebhook } from "@/lib/webhooks/service";
import {
  decryptSecret,
  encryptSecret,
  SIGNATURE_HEADER,
  signatureHeader,
  verifySignature,
  WebhookConfigError,
} from "@/lib/webhooks/signing";
import { assertSafeWebhookUrl, isPrivateAddress, UnsafeWebhookUrlError } from "@/lib/webhooks/ssrf";
import { webhookRouter } from "@/trpc/routers/webhookProcedures";

const PUBLIC_URL = "https://93.184.216.34/hooks";

const caller = (role = "user", userId = "u1") =>
  webhookRouter.createCaller({
    headers: new Headers(),
    session: { user: { id: userId, role, email: "a@example.com", name: "A" }, session: { id: "s1" } },
  } as never);

beforeEach(() => {
  store.endpoints.length = 0;
  store.deliveries.length = 0;
  queue.inngest = true;
  vi.clearAllMocks();
  vi.stubEnv("WEBHOOK_SECRET_KEY", "test-only-webhook-key-0123456789abcdef");
  posts.mockResolvedValue({ status: 200 });
});

describe("signing", () => {
  it("verifies its own signature and rejects a changed body or an old timestamp", () => {
    const body = JSON.stringify({ hello: "world" });
    const now = Date.UTC(2026, 9, 7);
    const header = signatureHeader(["whsec_a"], body, now);
    expect(verifySignature({ header, body, secret: "whsec_a", now })).toBe(true);
    expect(verifySignature({ header, body: `${body} `, secret: "whsec_a", now })).toBe(false);
    expect(verifySignature({ header, body, secret: "whsec_a", now: now + 301_000 })).toBe(false);
    expect(verifySignature({ header, body, secret: "whsec_other", now })).toBe(false);
  });

  it("during a rotation both the new and the old secret verify", () => {
    const header = signatureHeader(["whsec_new", "whsec_old"], "{}");
    expect(verifySignature({ header, body: "{}", secret: "whsec_new" })).toBe(true);
    expect(verifySignature({ header, body: "{}", secret: "whsec_old" })).toBe(true);
  });

  it("encrypts secrets at rest and needs WEBHOOK_SECRET_KEY", () => {
    const stored = encryptSecret("whsec_abc");
    expect(stored).not.toContain("whsec_abc");
    expect(decryptSecret(stored)).toBe("whsec_abc");
    vi.stubEnv("WEBHOOK_SECRET_KEY", "");
    expect(() => encryptSecret("x")).toThrow(WebhookConfigError);
  });
});

describe("SSRF guard", () => {
  it.each(["127.0.0.1", "10.1.2.3", "172.16.5.5", "192.168.1.1", "169.254.169.254", "100.64.0.1", "0.0.0.0", "::1", "fd00::1", "fe80::1", "::ffff:127.0.0.1"])(
    "treats %s as private",
    (address) => expect(isPrivateAddress(address)).toBe(true),
  );

  it("allows a public address", () => expect(isPrivateAddress("93.184.216.34")).toBe(false));

  it("rejects hosts that resolve inside the network, http in production and credentials", async () => {
    const resolveTo = (address: string) => async () => [address];
    await expect(assertSafeWebhookUrl("https://hooks.example.com", { resolve: resolveTo("127.0.0.1") })).rejects.toThrow(UnsafeWebhookUrlError);
    await expect(assertSafeWebhookUrl("https://hooks.example.com", { resolve: resolveTo("10.0.0.7") })).rejects.toThrow(UnsafeWebhookUrlError);
    await expect(assertSafeWebhookUrl("http://hooks.example.com", { resolve: resolveTo("93.184.216.34"), production: true })).rejects.toThrow(/https/);
    await expect(assertSafeWebhookUrl("https://user:pw@hooks.example.com", { resolve: resolveTo("93.184.216.34") })).rejects.toThrow(/credentials/);
    await expect(assertSafeWebhookUrl("https://hooks.example.com", { resolve: resolveTo("93.184.216.34") })).resolves.toBeInstanceOf(URL);
  });
});

describe("webhook router", () => {
  it("rejects private URLs when an endpoint is created", async () => {
    for (const url of ["http://127.0.0.1/hook", "http://10.0.0.5/hook", "http://[::1]/hook", "http://169.254.169.254/latest"]) {
      await expect(caller().create({ url, events: ["webhook.test"] })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    }
    expect(store.endpoints).toHaveLength(0);
  });

  it("returns the secret once, stores it encrypted and never lists it", async () => {
    const { secret } = await caller().create({ url: PUBLIC_URL, events: ["webhook.test"] });
    expect(secret).toMatch(/^whsec_/);
    expect(JSON.stringify(store.endpoints)).not.toContain(secret);
    expect(JSON.stringify(await caller().list())).not.toContain(secret);
  });

  it("rejects unknown event types", async () => {
    await expect(caller().create({ url: PUBLIC_URL, events: ["nope.nope"] })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("guests can read but not create; others cannot touch someone's endpoint", async () => {
    await expect(caller("guest").create({ url: PUBLIC_URL, events: ["webhook.test"] })).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(await caller("guest").list()).toEqual([]);
    const { endpoint } = await caller().create({ url: PUBLIC_URL, events: ["webhook.test"] });
    await expect(caller("user", "u2").delete({ id: endpoint.id })).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("sends a signed test event the documented check accepts", async () => {
    const { endpoint, secret } = await caller().create({ url: PUBLIC_URL, events: ["webhook.test"] });
    const { deliveryId } = await caller().sendTest({ id: endpoint.id });
    await attemptDelivery(deliveryId);

    const [, body, headers] = posts.mock.calls[0]!;
    expect(verifySignature({ header: headers[SIGNATURE_HEADER], body, secret })).toBe(true);
    expect(JSON.parse(body)).toMatchObject({ type: "webhook.test", apiVersion: expect.any(String), data: { message: expect.any(String) } });
    expect(store.deliveries[0]).toMatchObject({ status: "succeeded", attempt: 1, responseCode: 200 });
  });

  it("after a rotation, deliveries carry signatures for the old and the new secret", async () => {
    const { endpoint, secret: oldSecret } = await caller().create({ url: PUBLIC_URL, events: ["webhook.test"] });
    const { secret: newSecret } = await caller().rotateSecret({ id: endpoint.id });
    const { deliveryId } = await caller().sendTest({ id: endpoint.id });
    await attemptDelivery(deliveryId);
    const [, body, headers] = posts.mock.calls[0]!;
    expect(verifySignature({ header: headers[SIGNATURE_HEADER], body, secret: newSecret })).toBe(true);
    expect(verifySignature({ header: headers[SIGNATURE_HEADER], body, secret: oldSecret })).toBe(true);
  });

  it("replays a delivery with the same event id", async () => {
    const { endpoint } = await caller().create({ url: PUBLIC_URL, events: ["webhook.test"] });
    const { deliveryId } = await caller().sendTest({ id: endpoint.id });
    const replay = await caller().replay({ deliveryId });
    expect(store.deliveries.find((d) => d.id === replay.deliveryId)!.eventId).toBe(store.deliveries[0]!.eventId);
  });
});

describe("delivery", () => {
  async function endpointWithEvent() {
    const { endpoint } = await caller().create({ url: PUBLIC_URL, events: ["webhook.test"] });
    const { deliveryId } = await caller().sendTest({ id: endpoint.id });
    return { endpointId: endpoint.id, deliveryId };
  }

  it("a 500 retries on the schedule, then gives up", async () => {
    posts.mockResolvedValue({ status: 500 });
    const { deliveryId } = await endpointWithEvent();
    const now = new Date("2026-10-07T00:00:00Z");

    await attemptDelivery(deliveryId, now);
    expect(store.deliveries[0]).toMatchObject({ status: "retrying", attempt: 1, responseCode: 500 });
    expect(store.deliveries[0].nextAttemptAt).toEqual(new Date(now.getTime() + RETRY_DELAYS_MS[0]!));
    expect(enqueue).toHaveBeenLastCalledWith(expect.anything(), { deliveryId }, expect.objectContaining({ delayMs: RETRY_DELAYS_MS[0] }));

    for (let i = 1; i <= RETRY_DELAYS_MS.length; i++) await attemptDelivery(deliveryId, now);
    expect(store.deliveries[0]).toMatchObject({ status: "failed", attempt: RETRY_DELAYS_MS.length + 1, nextAttemptAt: null });
  });

  it("pauses the endpoint after the failure threshold", async () => {
    posts.mockResolvedValue({ status: 500 });
    const { endpointId, deliveryId } = await endpointWithEvent();
    for (let i = 0; i < DISABLE_AFTER_FAILURES; i++) {
      store.deliveries[0].status = "retrying";
      store.deliveries[0].attempt = 0;
      await attemptDelivery(deliveryId);
    }
    const endpoint = store.endpoints.find((e) => e.id === endpointId);
    expect(endpoint).toMatchObject({ enabled: false, consecutiveFailures: DISABLE_AFTER_FAILURES });
    expect(endpoint.disabledReason).toMatch(/Paused/);

    await caller().update({ id: endpointId, enabled: true });
    expect(store.endpoints[0]).toMatchObject({ enabled: true, consecutiveFailures: 0, disabledReason: null });
  });

  it("without a queue, a failure is recorded once and not retried inline", async () => {
    queue.inngest = false;
    posts.mockResolvedValue({ status: 503 });
    const { deliveryId } = await endpointWithEvent();
    await attemptDelivery(deliveryId);
    expect(store.deliveries[0]).toMatchObject({ status: "failed", attempt: 1 });
    expect(enqueue).toHaveBeenCalledTimes(1); // the original send only
  });

  it("refuses at delivery time a URL that now points inside the network", async () => {
    const { deliveryId } = await endpointWithEvent();
    store.endpoints[0].url = "http://127.0.0.1:8080/admin";
    await attemptDelivery(deliveryId);
    expect(posts).not.toHaveBeenCalled();
    expect(store.deliveries[0]).toMatchObject({ status: "failed" });
    expect(store.deliveries[0].error).toMatch(/private/);
  });
});

describe("emitWebhook", () => {
  it("queues one delivery per enabled, subscribed endpoint of the owner", async () => {
    await caller().create({ url: PUBLIC_URL, events: ["webhook.test"] });
    const { endpoint: off } = await caller().create({ url: PUBLIC_URL, events: ["webhook.test"] });
    await caller().update({ id: off.id, enabled: false });
    await caller("user", "u2").create({ url: PUBLIC_URL, events: ["webhook.test"] });

    expect(await emitWebhook("webhook.test", { message: "hi" }, { userId: "u1" })).toBe(1);
    expect(store.deliveries).toHaveLength(1);
  });

  it("never throws", async () => {
    db.webhookEndpoint.findMany.mockRejectedValueOnce(new Error("db down"));
    await expect(emitWebhook("webhook.test", { message: "hi" }, { userId: "u1" })).resolves.toBe(0);
  });
});
