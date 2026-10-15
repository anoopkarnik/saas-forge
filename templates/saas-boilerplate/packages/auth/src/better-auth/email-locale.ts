import { LOCALE_COOKIE, resolveLocale, type Locale } from "@workspace/i18n/config";

function cookieValue(header: string | null | undefined, name: string): string | undefined {
  for (const part of header?.split(";") ?? []) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) return rest.join("=");
  }
  return undefined;
}

/**
 * The language for an auth email: the user's saved choice, else the one they
 * are browsing in (cookie, then Accept-Language), else English. Users who
 * signed up with a social provider, or before locales existed, have none saved.
 */
export function emailLocale(user?: object, request?: Request): Locale {
  return resolveLocale({
    // Better Auth's callback types omit additional fields such as locale.
    userLocale: user && "locale" in user ? user.locale : undefined,
    cookie: cookieValue(request?.headers.get("cookie"), LOCALE_COOKIE),
    acceptLanguage: request?.headers.get("accept-language"),
  });
}
