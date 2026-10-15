export type AnalyticsAdapter = "posthog" | "console" | "none";

export const DEFAULT_POSTHOG_HOST = "https://us.i.posthog.com";

/** PostHog when a project key is set, console logging in development, otherwise nothing. */
export function resolveAdapter({ key, nodeEnv }: { key?: string; nodeEnv?: string }): AnalyticsAdapter {
  if (key?.trim()) return "posthog";
  return nodeEnv === "development" ? "console" : "none";
}

export function posthogHost(host?: string): string {
  return (host?.trim() || DEFAULT_POSTHOG_HOST).replace(/\/+$/, "");
}
