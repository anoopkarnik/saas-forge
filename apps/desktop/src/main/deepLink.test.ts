import { describe, expect, it } from "vitest";
import {
  DESKTOP_AUTH_CALLBACK_ROUTE,
  DESKTOP_DEEP_LINK_PREFIX,
  DESKTOP_DEEP_LINK_SCHEME,
  findDesktopDeepLink,
} from "./deepLink";

describe("desktop deep-link config", () => {
  it("uses the shared saas-forge protocol", () => {
    expect(DESKTOP_DEEP_LINK_SCHEME).toBe("saas-forge");
    expect(DESKTOP_DEEP_LINK_PREFIX).toBe("saas-forge://");
  });

  it("finds desktop deep links in argv", () => {
    expect(findDesktopDeepLink(["--flag", "saas-forge://auth-callback"])).toBe(
      "saas-forge://auth-callback",
    );
    expect(findDesktopDeepLink(["--flag", "myapp://auth-callback"])).toBe(
      undefined,
    );
  });

  it("keeps the desktop auth handoff route stable", () => {
    expect(DESKTOP_AUTH_CALLBACK_ROUTE).toBe("/auth-callback");
  });
});
