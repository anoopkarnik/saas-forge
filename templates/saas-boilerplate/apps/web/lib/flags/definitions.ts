/**
 * Every feature flag, with the value it has until an admin changes it. Flags
 * are per-user booleans (feature_flags module); global settings belong in
 * site config (lib/site-config). Read one with `useFlag(key)` in the UI and
 * enforce it on the server with `flagProcedure(key)` or `requireFlag(key)`.
 * Without the module every flag keeps its default.
 */
export type FlagDefinition = { description: string; default: boolean };

export const FLAGS = {
  // scaffold:begin ai
  "ai.voice": { description: "Voice input and spoken replies in AI chat.", default: true },
  // scaffold:end ai
  "beta.dashboardWidgets": { description: "Beta widgets on the home dashboard.", default: false },
} satisfies Record<string, FlagDefinition>;

export type FlagKey = keyof typeof FLAGS;
export type FlagValues = Record<FlagKey, boolean>;

/** Who a flag is evaluated for. */
export type FlagSubject = {
  userId?: string | null;
  role?: string | null;
  organizationId?: string | null;
  /** Cookie id for visitors who are not signed in (percentage rollouts). */
  anonymousId?: string | null;
};

// scaffold:begin feature_flags
export const ANONYMOUS_ID_COOKIE = "sf_aid";
// scaffold:end feature_flags

export const isFlagKey = (key: string): key is FlagKey => key in FLAGS;

export function flagDefaults(): FlagValues {
  return Object.fromEntries(Object.entries(FLAGS).map(([key, flag]) => [key, flag.default])) as FlagValues;
}
