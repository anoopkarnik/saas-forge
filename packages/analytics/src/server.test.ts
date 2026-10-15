import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { track } from "./server";

const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset().mockResolvedValue(new Response(null, { status: 200 }));
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("server track", () => {
  it("makes no network call without a PostHog key", async () => {
    vi.stubEnv("NEXT_PUBLIC_POSTHOG_KEY", "");
    vi.stubEnv("NODE_ENV", "production");
    await track("auth.signed_up", { method: "email" }, { distinctId: "u1" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("logs instead of sending in development", async () => {
    vi.stubEnv("NEXT_PUBLIC_POSTHOG_KEY", "");
    vi.stubEnv("NODE_ENV", "development");
    const log = vi.spyOn(console, "info").mockImplementation(() => {});
    await track("auth.signed_in", { method: "github" }, { distinctId: "u1" });
    expect(log).toHaveBeenCalledWith("[analytics]", "auth.signed_in", { distinctId: "u1", method: "github" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("sends the event, id and groups to the PostHog capture endpoint", async () => {
    vi.stubEnv("NEXT_PUBLIC_POSTHOG_KEY", "phc_test");
    vi.stubEnv("NEXT_PUBLIC_POSTHOG_HOST", "https://eu.i.posthog.com/");
    await track("auth.signed_up", { method: "email" }, { distinctId: "u1", groups: { organization: "o1" } });

    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe("https://eu.i.posthog.com/i/v0/e/");
    const body = JSON.parse(init.body);
    expect(body).toMatchObject({
      api_key: "phc_test",
      event: "auth.signed_up",
      distinct_id: "u1",
      properties: { method: "email", $groups: { organization: "o1" } },
    });
    expect(init.signal).toBeInstanceOf(AbortSignal);
  });

  it.each([
    ["a declined consent cookie", { cookie: "a=1; sf_analytics_consent=denied" }],
    ["Do Not Track", { dnt: "1" }],
    ["Global Privacy Control", { "sec-gpc": "1" }],
  ])("honours %s from the request", async (_label, headers) => {
    vi.stubEnv("NEXT_PUBLIC_POSTHOG_KEY", "phc_test");
    await track("auth.signed_in", { method: "email" }, { distinctId: "u1", headers: new Headers(headers) });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("never throws when PostHog is unreachable", async () => {
    vi.stubEnv("NEXT_PUBLIC_POSTHOG_KEY", "phc_test");
    fetchMock.mockRejectedValue(new Error("network down"));
    await expect(track("auth.signed_in", { method: "email" }, { distinctId: "u1" })).resolves.toBeUndefined();
  });

  it("rejects unknown events and wrong properties at compile time", () => {
    // @ts-expect-error unknown event
    void track("auth.unknown", {}, { distinctId: "u1" });
    // @ts-expect-error missing property
    void track("auth.signed_up", {}, { distinctId: "u1" });
  });
});
