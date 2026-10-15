import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  cookie: undefined as string | undefined,
  acceptLanguage: null as string | null,
  session: null as unknown,
  siteDefault: "en",
}));

vi.mock("next-intl/server", () => ({ getRequestConfig: (fn: unknown) => fn }));
vi.mock("next/headers", () => ({
  headers: async () => new Headers(state.acceptLanguage ? { "accept-language": state.acceptLanguage } : {}),
  cookies: async () => ({ get: () => (state.cookie ? { value: state.cookie } : undefined) }),
}));
vi.mock("@workspace/auth/better-auth/auth", () => ({
  auth: { api: { getSession: async () => (state.session instanceof Error ? Promise.reject(state.session) : state.session) } },
}));
vi.mock("@/lib/site-config/service", () => ({ getSiteConfig: async () => ({ "i18n.defaultLocale": state.siteDefault }) }));

import requestConfig from "../request";
const run = requestConfig as unknown as () => Promise<{ locale: string; messages: { common: { language: string } } }>;

beforeEach(() => Object.assign(state, { cookie: undefined, acceptLanguage: null, session: null, siteDefault: "en" }));

describe("i18n request config", () => {
  it("prefers the signed-in user's locale over the cookie", async () => {
    state.session = { user: { id: "u1", locale: "es" } };
    state.cookie = "en";
    expect((await run()).locale).toBe("es");
  });

  it("uses the cookie, then the browser language, then the site default", async () => {
    state.cookie = "es";
    expect((await run()).locale).toBe("es");
    state.cookie = undefined;
    state.acceptLanguage = "es-AR,es;q=0.9";
    expect((await run()).locale).toBe("es");
    state.acceptLanguage = "de";
    state.siteDefault = "es";
    expect((await run()).locale).toBe("es");
  });

  it("falls back to the cookie when the session lookup fails", async () => {
    state.session = new Error("db down");
    state.cookie = "es";
    const config = await run();
    expect(config.locale).toBe("es");
    expect(config.messages.common.language).toBe("Idioma");
  });

  it("sets a time zone so server and client render the same markup", async () => {
    expect((await run() as unknown as { timeZone?: string }).timeZone).toBe("UTC");
  });
});
