import { randomBytes } from "node:crypto";
import { z } from "zod";

/**
 * Outgoing webhook events (webhooks module). Never change a payload shape
 * under an existing apiVersion: add fields only, or ship a new version.
 * Events of other modules sit in their marker regions.
 */
export const WEBHOOK_API_VERSION = "2026-10-07";

export const WEBHOOK_EVENTS = {
  "webhook.test": {
    description: "Sent by Send test event.",
    schema: z.object({ message: z.string() }),
  },
  // scaffold:begin billing
  "payment.succeeded": {
    description: "A credits purchase completed.",
    schema: z.object({
      userId: z.string(),
      credits: z.number(),
      amount: z.number().nullable(),
      currency: z.string().nullable(),
      checkoutId: z.string(),
    }),
  },
  "payment.failed": {
    description: "A credits purchase failed.",
    schema: z.object({ userId: z.string(), reason: z.string().nullable() }),
  },
  // scaffold:end billing
  // scaffold:begin multi_tenancy
  "org.member.added": {
    description: "Someone joined the workspace.",
    schema: z.object({ organizationId: z.string(), userId: z.string(), role: z.string() }),
  },
  "org.member.removed": {
    description: "A member was removed from the workspace.",
    schema: z.object({ organizationId: z.string(), memberId: z.string() }),
  },
  // scaffold:end multi_tenancy
  // scaffold:begin api_keys
  "api_key.created": {
    description: "An API key was created.",
    schema: z.object({ keyId: z.string(), label: z.string(), scopes: z.array(z.string()) }),
  },
  "api_key.revoked": {
    description: "An API key was revoked.",
    schema: z.object({ keyId: z.string() }),
  },
  // scaffold:end api_keys
} satisfies Record<string, { description: string; schema: z.ZodType }>;

export type WebhookEventType = keyof typeof WEBHOOK_EVENTS;
export type WebhookEventData<T extends WebhookEventType> = z.input<(typeof WEBHOOK_EVENTS)[T]["schema"]>;

export type WebhookEnvelope = {
  id: string;
  type: string;
  apiVersion: string;
  createdAt: string;
  data: unknown;
};

export const isWebhookEventType = (type: string): type is WebhookEventType => type in WEBHOOK_EVENTS;

/** The versioned envelope every delivery carries; `data` is checked against the event's schema. */
export function buildEnvelope<T extends WebhookEventType>(type: T, data: WebhookEventData<T>, now = new Date()): WebhookEnvelope {
  const schema: z.ZodType = WEBHOOK_EVENTS[type].schema;
  return {
    id: `evt_${randomBytes(12).toString("base64url")}`,
    type,
    apiVersion: WEBHOOK_API_VERSION,
    createdAt: now.toISOString(),
    data: schema.parse(data),
  };
}
