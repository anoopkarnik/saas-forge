import { describe, expect, it } from "vitest";
import { emailLocale } from "./email-locale";

const request = (headers: Record<string, string>) => new Request("https://app.test/api/auth/x", { headers });

describe("emailLocale", () => {
  it("uses the user's saved locale first", () => {
    expect(emailLocale({ locale: "es" }, request({ cookie: "NEXT_LOCALE=en" }))).toBe("es");
  });

  it("falls back to the language the visitor is browsing in", () => {
    expect(emailLocale({ locale: null }, request({ cookie: "theme=dark; NEXT_LOCALE=es" }))).toBe("es");
    expect(emailLocale({}, request({ "accept-language": "es-MX,es;q=0.9" }))).toBe("es");
  });

  it("is English without a saved locale or a request", () => {
    expect(emailLocale({ locale: null })).toBe("en");
    expect(emailLocale(undefined, request({ cookie: "NEXT_LOCALE=xx" }))).toBe("en");
  });
});
