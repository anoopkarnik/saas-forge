import { z } from "zod";
import db from "@workspace/database/client";
import { defineJob, enqueue } from "@workspace/jobs/index";
import { inngestEnabled } from "@workspace/jobs/inngest";
import { decryptSecret, SIGNATURE_HEADER, signatureHeader } from "@/lib/webhooks/signing";
import { assertSafeWebhookUrl, UnsafeWebhookUrlError } from "@/lib/webhooks/ssrf";
import { postWebhook } from "@/lib/webhooks/transport";
// scaffold:begin notifications
import { webhookDisabled } from "@/lib/notifications/catalog";
import { notify } from "@/lib/notifications/notify";
// scaffold:end notifications

/** Waits before attempts 2–7: about 24 hours in all. */
export const RETRY_DELAYS_MS = [60_000, 5 * 60_000, 30 * 60_000, 2 * 3600_000, 6 * 3600_000, 15 * 3600_000];
/** Failed attempts in a row (across deliveries) that pause an endpoint. */
export const DISABLE_AFTER_FAILURES = 15;

export const deliverWebhookJob = defineJob(
  "webhook.deliver",
  z.object({ deliveryId: z.string() }),
  async ({ deliveryId }) => {
    await attemptDelivery(deliveryId);
  },
  // Each attempt records its own outcome and schedules the next one.
  { retries: 0 },
);

/** Signs with the current secret, and the previous one while its 24 h overlap lasts. */
function signingSecrets(endpoint: { secretEncrypted: string; previousSecretEncrypted: string | null; previousSecretExpiresAt: Date | null }, now: Date) {
  const secrets = [decryptSecret(endpoint.secretEncrypted)];
  if (endpoint.previousSecretEncrypted && endpoint.previousSecretExpiresAt && endpoint.previousSecretExpiresAt > now) {
    secrets.push(decryptSecret(endpoint.previousSecretEncrypted));
  }
  return secrets;
}

/**
 * One attempt of one delivery. A 2xx resets the endpoint's failure count;
 * anything else schedules the next attempt (on Inngest; inline runs make one
 * attempt) until the schedule ends or the endpoint gets paused.
 */
export async function attemptDelivery(deliveryId: string, now = new Date()): Promise<void> {
  const delivery = await db.webhookDelivery.findUnique({ where: { id: deliveryId }, include: { endpoint: true } });
  if (!delivery || delivery.status === "succeeded") return;
  const { endpoint } = delivery;
  if (!endpoint.enabled) {
    await db.webhookDelivery.update({ where: { id: deliveryId }, data: { status: "failed", error: "Endpoint is disabled.", nextAttemptAt: null } });
    return;
  }

  const body = JSON.stringify(delivery.payload);
  const started = Date.now();
  let status = 0;
  let error: string | null = null;
  let permanent = false;
  try {
    const url = await assertSafeWebhookUrl(endpoint.url);
    ({ status } = await postWebhook(url, body, {
      "content-type": "application/json",
      "user-agent": "SaaSForge-Webhooks/1",
      [SIGNATURE_HEADER]: signatureHeader(signingSecrets(endpoint, now), body, now.getTime()),
      "SaaSForge-Event-Id": delivery.eventId,
      "SaaSForge-Event-Type": delivery.eventType,
    }));
    if (status < 200 || status >= 300) error = `Responded ${status}`;
  } catch (caught) {
    error = (caught as Error).message;
    permanent = caught instanceof UnsafeWebhookUrlError;
  }
  const attempt = delivery.attempt + 1;
  const durationMs = Date.now() - started;

  if (!error) {
    await db.$transaction([
      db.webhookDelivery.update({
        where: { id: deliveryId },
        data: { status: "succeeded", attempt, responseCode: status, durationMs, error: null, nextAttemptAt: null },
      }),
      db.webhookEndpoint.update({ where: { id: endpoint.id }, data: { consecutiveFailures: 0 } }),
    ]);
    return;
  }

  const failures = endpoint.consecutiveFailures + 1;
  const pause = failures >= DISABLE_AFTER_FAILURES;
  const delay = !permanent && !pause ? RETRY_DELAYS_MS[attempt - 1] : undefined;
  const retry = delay !== undefined && inngestEnabled();
  await db.$transaction([
    db.webhookDelivery.update({
      where: { id: deliveryId },
      data: {
        status: retry ? "retrying" : "failed",
        attempt,
        responseCode: status || null,
        durationMs,
        error,
        nextAttemptAt: retry ? new Date(now.getTime() + delay) : null,
      },
    }),
    db.webhookEndpoint.update({
      where: { id: endpoint.id },
      data: {
        consecutiveFailures: failures,
        ...(pause ? { enabled: false, disabledReason: `Paused after ${failures} failed attempts in a row.` } : {}),
      },
    }),
  ]);

  if (retry) {
    await enqueue(deliverWebhookJob, { deliveryId }, { delayMs: delay, dedupeKey: `webhook:${deliveryId}:${attempt}` });
  }
  // scaffold:begin notifications
  if (pause && endpoint.ownerUserId) {
    await notify(webhookDisabled, endpoint.ownerUserId, { url: endpoint.url, failures }, { dedupeKey: `webhook-disabled:${endpoint.id}:${failures}` });
  }
  // scaffold:end notifications
}
