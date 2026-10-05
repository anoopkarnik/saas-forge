// How a project's .env files are written. Shared by the download builder and
// `pnpm doctor` (scripts/doctor.mjs imports this file directly through Node's
// type stripping), so keep it free of imports and of TypeScript-only syntax
// such as enums.

type Env = Record<string, string | undefined>;

/** Fills a .env.example template with values, keeping comments and order. */
export function fillEnvTemplate(template: string | undefined, values: Record<string, string>): string {
  if (template === undefined) {
    return Object.entries(values)
      .map(([key, value]) => `${key}=${value}`)
      .join("\n");
  }

  return template
    .split("\n")
    .map((line) => {
      const key = line.match(/^([A-Z_][A-Z0-9_]*)=/)?.[1];
      return key && key in values ? `${key}=${values[key]}` : line;
    })
    .join("\n");
}

/**
 * The mobile and desktop env values, derived from the web values. The native
 * clients only read public toggles, never secrets.
 */
export function nativeEnvValues(
  web: Env,
  modules: readonly string[],
): { mobile: Record<string, string>; desktop: Record<string, string> } {
  const support = web.NEXT_PUBLIC_SUPPORT_FEATURES
    ? web.NEXT_PUBLIC_SUPPORT_FEATURES.split(",").map((feature) => feature.trim())
    : [];
  const flag = (key: string) => (web[key] === "true" ? "true" : "false");
  const quoted = (value: string) => `"${value}"`;
  // scaffold:begin billing
  const gateway = modules.includes("billing") ? web.NEXT_PUBLIC_PAYMENT_GATEWAY || "none" : "none";
  // scaffold:end billing
  // scaffold:begin ai
  const aiEnabled = modules.includes("ai") ? web.NEXT_PUBLIC_AI_ENABLED || "false" : "false";
  // scaffold:end ai

  return {
    mobile: {
      EXPO_PUBLIC_API_URL: web.NEXT_PUBLIC_URL || "http://localhost:3000",
      EXPO_PUBLIC_APP_URL: "http://localhost:8081",
      EXPO_PUBLIC_AUTH_EMAIL: flag("NEXT_PUBLIC_AUTH_EMAIL"),
      EXPO_PUBLIC_AUTH_GOOGLE: flag("NEXT_PUBLIC_AUTH_GOOGLE"),
      EXPO_PUBLIC_AUTH_GITHUB: flag("NEXT_PUBLIC_AUTH_GITHUB"),
      EXPO_PUBLIC_AUTH_LINKEDIN: flag("NEXT_PUBLIC_AUTH_LINKEDIN"),
      EXPO_PUBLIC_SUPPORT_MAIL: support.includes("support_mail") ? "true" : "false",
      EXPO_PUBLIC_THEME: web.NEXT_PUBLIC_THEME || "green",
      EXPO_PUBLIC_THEME_TYPE: web.NEXT_PUBLIC_THEME_TYPE || "light",
      // scaffold:begin billing
      EXPO_PUBLIC_PAYMENT_GATEWAY: gateway,
      // scaffold:end billing
      EXPO_PUBLIC_CALENDLY_BOOKING_URL: web.NEXT_PUBLIC_CALENDLY_BOOKING_URL || '""',
      // scaffold:begin ai
      EXPO_PUBLIC_AI_ENABLED: aiEnabled,
      // scaffold:end ai
    },
    desktop: {
      VITE_API_URL: quoted(web.NEXT_PUBLIC_URL || "http://localhost:3000"),
      NEXT_PUBLIC_AUTH_FRAMEWORK: quoted(web.NEXT_PUBLIC_AUTH_FRAMEWORK || "better-auth"),
      VITE_AUTH_EMAIL: flag("NEXT_PUBLIC_AUTH_EMAIL"),
      VITE_AUTH_GOOGLE: flag("NEXT_PUBLIC_AUTH_GOOGLE"),
      VITE_AUTH_GITHUB: flag("NEXT_PUBLIC_AUTH_GITHUB"),
      VITE_AUTH_LINKEDIN: flag("NEXT_PUBLIC_AUTH_LINKEDIN"),
      // scaffold:begin billing
      VITE_PAYMENT_GATEWAY: quoted(gateway),
      // scaffold:end billing
      VITE_SUPPORT_MAIL: quoted(support.includes("support_mail") ? web.NEXT_PUBLIC_SUPPORT_MAIL || "" : ""),
      VITE_CALENDLY_BOOKING_URL: quoted(
        support.includes("calendly") ? web.NEXT_PUBLIC_CALENDLY_BOOKING_URL || "" : "",
      ),
      VITE_THEME: web.NEXT_PUBLIC_THEME || "green",
      VITE_THEME_TYPE: web.NEXT_PUBLIC_THEME_TYPE || "light",
      // scaffold:begin ai
      VITE_AI_ENABLED: aiEnabled,
      // scaffold:end ai
    },
  };
}
