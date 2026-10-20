import { describe, expect, it } from "vitest";
import { isLocale, parseAcceptLanguage, resolveLocale, toLocale } from "./config";

describe("locale config", () => {
  it("recognises supported locales only", () => {
    expect(isLocale("es")).toBe(true);
    expect(isLocale("fr")).toBe(false);
    expect(toLocale(null)).toBeUndefined();
  });

  it("picks the first supported Accept-Language entry by quality, matching base languages", () => {
    expect(parseAcceptLanguage("fr-CA,fr;q=0.9,es-MX;q=0.8,en;q=0.5")).toBe("es");
    expect(parseAcceptLanguage("en;q=0.2, es;q=0.9")).toBe("es");
    expect(parseAcceptLanguage("de, *;q=0.1")).toBeUndefined();
    expect(parseAcceptLanguage(undefined)).toBeUndefined();
  });

  it("resolves user, then cookie, then header, then site default, then en", () => {
    const all = { userLocale: "es", cookie: "en", acceptLanguage: "en", siteDefault: "en" };
    expect(resolveLocale(all)).toBe("es");
    expect(resolveLocale({ ...all, userLocale: null, cookie: "es" })).toBe("es");
    expect(resolveLocale({ cookie: "xx", acceptLanguage: "es-ES" })).toBe("es");
    expect(resolveLocale({ acceptLanguage: "de", siteDefault: "es" })).toBe("es");
    expect(resolveLocale({ siteDefault: "klingon" })).toBe("en");
  });
});
