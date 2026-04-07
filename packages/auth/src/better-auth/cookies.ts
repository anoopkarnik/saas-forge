const DEFAULT_AUTH_COOKIE_PREFIX = "better-auth";

const normalizeCookiePrefix = (value?: string | null) => {
  if (!value) return undefined;

  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return normalized || undefined;
};

export const authCookiePrefix =
  normalizeCookiePrefix(process.env.NEXT_PUBLIC_SAAS_NAME) ||
  DEFAULT_AUTH_COOKIE_PREFIX;

export const authSessionCookieName = `${authCookiePrefix}.session_token`;
export const secureAuthSessionCookieName = `__Secure-${authSessionCookieName}`;
