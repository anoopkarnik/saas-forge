/**
 * Every product analytics event and its properties, so an unknown event or a
 * wrong property fails typecheck. Dashboards query these names: add events,
 * never rename one. Properties are ids, counts and enums only, never emails
 * or names. Each module's events sit inside its markers and leave with it.
 * The registry with descriptions is README.md in this package.
 */
export interface AnalyticsEvents {
  "auth.signed_up": { method: string };
  "auth.signed_in": { method: string };
  /** `step` is a checklist task key, or "wizard" when the welcome wizard is finished. */
  "onboarding.step_completed": { step: string };
  "billing.checkout_started": { credits: number; gateway: string };
  "billing.checkout_completed": { credits: number; gateway: string };
  "ai.chat_sent": { provider: string; model: string };
  "org.created": { organizationId: string };
  "org.member_invited": { organizationId: string; role: string };
}

export type AnalyticsEventName = keyof AnalyticsEvents;
