import type { PostHog } from "posthog-js";
import { posthogHost, resolveAdapter } from "./config";
import { CONSENT_COOKIE, readConsent, type Consent } from "./consent";
import type { AnalyticsEventName, AnalyticsEvents } from "./events";

/**
 * Browser analytics. Nothing loads until `initAnalytics` allows it: a PostHog
 * key is set, the visitor has not opted out (banner, Do Not Track, Global
 * Privacy Control) and, when consent is required, has accepted. Calls made
 * before PostHog loads are queued; calls that are not allowed are dropped.
 */

// Literal reads so Next inlines them into the browser bundle.
const adapter = resolveAdapter({ key: process.env.NEXT_PUBLIC_POSTHOG_KEY, nodeEnv: process.env.NODE_ENV });

let posthog: PostHog | null = null;
let loading = false;
let queue: Array<(instance: PostHog) => void> = [];
let consentRequired = false;

function browserOptedOut(): boolean {
  const nav = navigator as Navigator & { globalPrivacyControl?: boolean };
  return nav.doNotTrack === "1" || nav.globalPrivacyControl === true;
}

function allowed(): boolean {
  if (adapter === "none" || browserOptedOut()) return false;
  const consent = getConsent();
  return consent === "granted" || (consent === null && !consentRequired);
}

function load() {
  if (adapter !== "posthog" || posthog || loading) return;
  loading = true;
  void import("posthog-js").then(({ default: instance }) => {
    instance.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
      api_host: posthogHost(process.env.NEXT_PUBLIC_POSTHOG_HOST),
      // Only the typed events below, pageviews and page leaves: no clicks or input values.
      autocapture: false,
      capture_pageview: "history_change",
      capture_pageleave: true,
      disable_session_recording: true,
      disable_surveys: true,
      respect_dnt: true,
      person_profiles: "identified_only",
    });
    posthog = instance;
    loading = false;
    for (const call of queue) call(instance);
    queue = [];
  });
}

function run(call: (instance: PostHog) => void, describe: () => unknown[]) {
  if (!allowed()) return;
  if (adapter === "console") {
    console.info("[analytics]", ...describe());
    return;
  }
  if (posthog) call(posthog);
  else {
    queue.push(call);
    load();
  }
}

/** Call once on page load; `consentRequired` comes from the `analytics.consentRequired` site setting. */
export function initAnalytics(options: { consentRequired: boolean }): void {
  consentRequired = options.consentRequired;
  if (allowed()) load();
}

export function track<E extends AnalyticsEventName>(event: E, properties: AnalyticsEvents[E]): void {
  run((instance) => instance.capture(event, properties), () => [event, properties]);
}

/** Links this browser to the signed-in user. Pass the id only: no email or name. */
export function identify(userId: string): void {
  run((instance) => instance.identify(userId), () => ["identify", userId]);
}

export function group(type: string, id: string): void {
  run((instance) => instance.group(type, id), () => ["group", type, id]);
}

/** On sign-out, so the next visitor on this browser starts anonymous. */
export function reset(): void {
  posthog?.reset();
}

export function getConsent(): Consent | null {
  return readConsent(typeof document === "undefined" ? null : document.cookie);
}

export function setConsent(consent: Consent): void {
  document.cookie = `${CONSENT_COOKIE}=${consent}; Max-Age=31536000; Path=/; SameSite=Lax`;
  if (consent === "denied") {
    posthog?.opt_out_capturing();
    queue = [];
    return;
  }
  posthog?.opt_in_capturing();
  if (allowed()) load();
}
