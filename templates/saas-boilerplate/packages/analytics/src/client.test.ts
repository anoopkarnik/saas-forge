// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const posthog = {
  init: vi.fn(),
  capture: vi.fn(),
  identify: vi.fn(),
  group: vi.fn(),
  reset: vi.fn(),
  opt_in_capturing: vi.fn(),
  opt_out_capturing: vi.fn(),
};
vi.mock("posthog-js", () => ({ default: posthog }));

/** The adapter is read at import, so each test imports a fresh copy after setting env. */
async function loadClient(key: string) {
  vi.stubEnv("NEXT_PUBLIC_POSTHOG_KEY", key);
  vi.resetModules();
  return import("./client");
}

const flush = () => new Promise((resolve) => setTimeout(resolve, 20));

beforeEach(() => {
  document.cookie = "sf_analytics_consent=; Max-Age=0; Path=/";
  vi.clearAllMocks();
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("browser analytics", () => {
  it("never loads PostHog without a key", async () => {
    const client = await loadClient("");
    client.initAnalytics({ consentRequired: false });
    client.track("auth.signed_in", { method: "email" });
    await flush();
    expect(posthog.init).not.toHaveBeenCalled();
  });

  it("loads PostHog without autocapture and flushes queued calls", async () => {
    const client = await loadClient("phc_test");
    client.identify("u1");
    client.track("auth.signed_in", { method: "email" });
    await vi.waitFor(() => expect(posthog.capture).toHaveBeenCalled());

    expect(posthog.init).toHaveBeenCalledWith("phc_test", expect.objectContaining({ autocapture: false, respect_dnt: true }));
    expect(posthog.identify).toHaveBeenCalledWith("u1");
    expect(posthog.capture).toHaveBeenCalledWith("auth.signed_in", { method: "email" });
  });

  it("waits for consent when it is required, and stays off when declined", async () => {
    const client = await loadClient("phc_test");
    client.initAnalytics({ consentRequired: true });
    client.track("auth.signed_in", { method: "email" });
    await flush();
    expect(posthog.init).not.toHaveBeenCalled();

    client.setConsent("denied");
    client.track("auth.signed_in", { method: "email" });
    await flush();
    expect(posthog.init).not.toHaveBeenCalled();
    expect(document.cookie).toContain("sf_analytics_consent=denied");

    client.setConsent("granted");
    client.track("auth.signed_in", { method: "email" });
    await vi.waitFor(() => expect(posthog.capture).toHaveBeenCalled());
    expect(posthog.init).toHaveBeenCalledOnce();
    expect(posthog.capture).toHaveBeenCalledOnce();
  });

  it("honours Global Privacy Control", async () => {
    vi.stubGlobal("navigator", { ...navigator, globalPrivacyControl: true });
    const client = await loadClient("phc_test");
    client.initAnalytics({ consentRequired: false });
    client.track("auth.signed_in", { method: "email" });
    await flush();
    expect(posthog.init).not.toHaveBeenCalled();
  });
});
