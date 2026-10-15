/** Set by the consent banner (or `setConsent`) for a year. */
export const CONSENT_COOKIE = "sf_analytics_consent";

export type Consent = "granted" | "denied";

export type HeadersLike = { get(name: string): string | null };

export function readConsent(cookieHeader: string | null | undefined): Consent | null {
  for (const part of (cookieHeader ?? "").split(";")) {
    const [name, value] = part.trim().split("=");
    if (name === CONSENT_COOKIE && (value === "granted" || value === "denied")) return value;
  }
  return null;
}

/** The visitor declined analytics, or their browser sends Do Not Track or Global Privacy Control. */
export function isOptedOut(headers: HeadersLike): boolean {
  return (
    readConsent(headers.get("cookie")) === "denied" ||
    headers.get("dnt") === "1" ||
    headers.get("sec-gpc") === "1"
  );
}
