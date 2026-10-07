import { z } from "zod";
import { SECRET_NAME_PATTERN } from "@/lib/env";

/**
 * Settings an admin can change at runtime from /admin/settings. Each one
 * resolves DB row -> env var -> default, so a site with no rows renders
 * exactly as its env says. Client-safe: no database access here.
 */

export const THEME_COLORS = ["blue", "violet", "neutral", "red", "yellow", "green", "orange", "rose"] as const;

export type SettingDefinition<S extends z.ZodType = z.ZodType> = {
  schema: S;
  default: z.infer<S>;
  /** Readable by anyone through `siteConfig.get`. */
  public: boolean;
  group: string;
  label: string;
  description?: string;
  /** Env var used when no row is stored. */
  env?: string;
  /** AppSetting key when it predates this registry. */
  storageKey?: string;
};

/** Keeps `public` as a literal so `PublicSiteConfig` can be derived from it. */
export function setting<S extends z.ZodType, P extends boolean>(
  definition: SettingDefinition<S> & { public: P },
): SettingDefinition<S> & { public: P } {
  return definition;
}

const optionalUrl = z.union([z.literal(""), z.url()]);

export const SETTINGS = {
  "branding.saasName": setting({
    group: "Branding",
    label: "Product name",
    description: "Page titles and link previews.",
    public: true,
    schema: z.string().trim().min(1).max(80),
    env: "NEXT_PUBLIC_SAAS_NAME",
    default: "SaaS Forge",
  }),
  "branding.description": setting({
    group: "Branding",
    label: "Site description",
    public: true,
    schema: z.string().trim().min(1).max(300),
    env: "NEXT_PUBLIC_SITE_DESCRIPTION",
    default: "Boilerplate to build and deploy SaaS products quickly.",
  }),
  "branding.theme": setting({
    group: "Branding",
    label: "Theme colour",
    public: true,
    schema: z.enum(THEME_COLORS),
    env: "NEXT_PUBLIC_THEME",
    default: "green",
  }),
  "branding.themeType": setting({
    group: "Branding",
    label: "Default appearance",
    public: true,
    schema: z.enum(["system", "light", "dark"]),
    env: "NEXT_PUBLIC_THEME_TYPE",
    default: "system",
  }),
  "auth.email.visible": setting({
    group: "Auth",
    label: "Email sign-in",
    public: true,
    schema: z.boolean(),
    env: "NEXT_PUBLIC_AUTH_EMAIL",
    default: false,
  }),
  "auth.google.visible": setting({
    group: "Auth",
    label: "Google button",
    public: true,
    schema: z.boolean(),
    env: "NEXT_PUBLIC_AUTH_GOOGLE",
    default: false,
  }),
  "auth.github.visible": setting({
    group: "Auth",
    label: "GitHub button",
    public: true,
    schema: z.boolean(),
    env: "NEXT_PUBLIC_AUTH_GITHUB",
    default: false,
  }),
  "auth.linkedin.visible": setting({
    group: "Auth",
    label: "LinkedIn button",
    public: true,
    schema: z.boolean(),
    env: "NEXT_PUBLIC_AUTH_LINKEDIN",
    default: false,
  }),
  "support.calendlyUrl": setting({
    group: "Support",
    label: "Calendly booking URL",
    description: "The support email stays in env: it is also the address emails are sent from.",
    public: true,
    schema: optionalUrl,
    env: "NEXT_PUBLIC_CALENDLY_BOOKING_URL",
    default: "",
  }),
  "analytics.gaMeasurementId": setting({
    group: "Analytics",
    label: "Google Analytics measurement ID",
    public: true,
    schema: z.union([z.literal(""), z.string().regex(/^G-[A-Z0-9]+$/, "Expected an ID like G-XXXXXXX")]),
    env: "NEXT_PUBLIC_GOOGLE_ANALYTICS_MEASUREMENT_ID",
    default: "",
  }),
  "registration.mode": setting({
    group: "Registration",
    label: "Who can sign up",
    public: true,
    schema: z.enum(["OPEN", "INVITE_ONLY"]),
    storageKey: "registration_mode",
    default: "OPEN",
  }),
};

export type SettingKey = keyof typeof SETTINGS;
export type SiteConfig = { [K in SettingKey]: z.infer<(typeof SETTINGS)[K]["schema"]> };
type PublicKey = { [K in SettingKey]: (typeof SETTINGS)[K]["public"] extends true ? K : never }[SettingKey];
export type PublicSiteConfig = Pick<SiteConfig, PublicKey>;

/** Secrets stay in env: a key or env name that looks like a credential is a mistake. */
export function assertSafeSettings(settings: Record<string, SettingDefinition>): void {
  for (const [key, definition] of Object.entries(settings)) {
    const name = key.replace(/([a-z])([A-Z])/g, "$1_$2").replace(/\./g, "_").toUpperCase();
    if (SECRET_NAME_PATTERN.test(name) || (definition.env && SECRET_NAME_PATTERN.test(definition.env))) {
      throw new Error(`Site setting "${key}" looks like a secret; secrets belong in env, not site config.`);
    }
  }
}
assertSafeSettings(SETTINGS);

export function publicSiteConfig<T extends Record<string, unknown>>(
  config: T,
  settings: Record<string, SettingDefinition> = SETTINGS,
): Partial<T> {
  return Object.fromEntries(Object.entries(config).filter(([key]) => settings[key]?.public)) as Partial<T>;
}
