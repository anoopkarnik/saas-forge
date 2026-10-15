import { LOCALE_COOKIE, type Locale } from "./config";

/** Remembers a visitor's language for a year (browser only). */
export function setLocaleCookie(locale: Locale): void {
  document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; max-age=31536000; samesite=lax`;
}
