export const LOCALES = ["en", "es"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "en";
/** next-intl's conventional cookie name; holds the visitor's last choice. */
export const LOCALE_COOKIE = "NEXT_LOCALE";

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}

export function toLocale(value: unknown): Locale | undefined {
  return isLocale(value) ? value : undefined;
}

/** The best supported locale in an Accept-Language header ("es-MX" counts as "es"). */
export function parseAcceptLanguage(header: string | null | undefined): Locale | undefined {
  if (!header) return undefined;
  const ranked = header
    .split(",")
    .map((part, index) => {
      const [tag = "", ...params] = part.trim().split(";");
      const q = params.map((p) => p.trim()).find((p) => p.startsWith("q="));
      return { base: tag.toLowerCase().split("-")[0], quality: q ? Number(q.slice(2)) : 1, index };
    })
    .filter((entry) => entry.quality > 0)
    .sort((a, b) => b.quality - a.quality || a.index - b.index);
  return ranked.map((entry) => toLocale(entry.base)).find(Boolean);
}

export function resolveLocale(input: {
  userLocale?: unknown;
  cookie?: unknown;
  acceptLanguage?: string | null;
  siteDefault?: unknown;
}): Locale {
  return (
    toLocale(input.userLocale) ??
    toLocale(input.cookie) ??
    parseAcceptLanguage(input.acceptLanguage) ??
    toLocale(input.siteDefault) ??
    DEFAULT_LOCALE
  );
}
