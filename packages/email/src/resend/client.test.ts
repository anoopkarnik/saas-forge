import { afterEach, describe, expect, it, vi } from "vitest";
import { getResendClient, warnEmailSkipped } from "./client";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("getResendClient", () => {
  it.each([
    ["no client selected", "none", "re_123"],
    ["resend without a key", "resend", ""],
    ["client unset", undefined, "re_123"],
  ])("returns null with %s", (_label, client, key) => {
    vi.stubEnv("NEXT_PUBLIC_EMAIL_CLIENT", client as string);
    vi.stubEnv("RESEND_API_KEY", key);
    expect(getResendClient()).toBeNull();
  });

  it("returns a client when resend is configured", () => {
    vi.stubEnv("NEXT_PUBLIC_EMAIL_CLIENT", "resend");
    vi.stubEnv("RESEND_API_KEY", "re_123");
    expect(getResendClient()).not.toBeNull();
  });
});

describe("warnEmailSkipped", () => {
  it("includes the link outside production", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.stubEnv("NODE_ENV", "development");
    warnEmailSkipped("Verify", "a@example.com", "http://localhost/verify?token=t");
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("Link: http://localhost/verify?token=t"));
  });

  it("never logs the link in production", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.stubEnv("NODE_ENV", "production");
    warnEmailSkipped("Verify", "a@example.com", "https://app/verify?token=secret");
    expect(warn).toHaveBeenCalledWith(expect.not.stringContaining("secret"));
  });
});
