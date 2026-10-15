import { posthogHost, resolveAdapter } from "./config";
import { isOptedOut, type HeadersLike } from "./consent";
import type { AnalyticsEventName, AnalyticsEvents } from "./events";

export type ServerTrackOptions = {
  /** The user id. Never an email. */
  distinctId: string;
  /** The request the action came from, so its opt-out signals are honoured. */
  headers?: HeadersLike | null;
  /** PostHog groups, e.g. `{ organization: id }`. */
  groups?: Record<string, string>;
};

const TIMEOUT_MS = 1000;

/**
 * Records a server-side event. Never throws and gives up after a second, so
 * analytics cannot fail or stall the action it measures. Awaited rather than
 * fire-and-forget because serverless functions may freeze once they respond.
 */
export async function track<E extends AnalyticsEventName>(
  event: E,
  properties: AnalyticsEvents[E],
  { distinctId, headers, groups }: ServerTrackOptions,
): Promise<void> {
  try {
    if (headers && isOptedOut(headers)) return;
    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    const adapter = resolveAdapter({ key, nodeEnv: process.env.NODE_ENV });
    if (adapter === "none") return;
    if (adapter === "console") {
      console.info("[analytics]", event, { distinctId, ...properties, ...(groups ? { groups } : {}) });
      return;
    }
    await fetch(`${posthogHost(process.env.NEXT_PUBLIC_POSTHOG_HOST)}/i/v0/e/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: key,
        event,
        distinct_id: distinctId,
        properties: { ...properties, ...(groups ? { $groups: groups } : {}), $lib: "saas-forge-server" },
        timestamp: new Date().toISOString(),
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch {
    // Analytics never breaks the action it measures.
  }
}
