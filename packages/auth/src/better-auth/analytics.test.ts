import { beforeEach, describe, expect, it, vi } from "vitest";

const { track } = vi.hoisted(() => ({ track: vi.fn() }));
vi.mock("@workspace/analytics/server", () => ({ track }));

import { authMethod, trackSignedIn, trackSignedUp } from "./analytics";

beforeEach(() => track.mockReset());

describe("authMethod", () => {
  it.each([
    ["/sign-up/email", "email"],
    ["/sign-in/email", "email"],
    ["/verify-email", "email"],
    ["/callback/github", "github"],
    ["/oauth2/callback/linkedin", "linkedin"],
    ["/sign-in/anonymous", "other"],
    [undefined, "other"],
  ])("%s -> %s", (path, method) => {
    expect(authMethod(path)).toBe(method);
  });
});

describe("auth events", () => {
  it("tracks sign-up with the user id and request headers only", async () => {
    const headers = new Headers({ dnt: "1" });
    await trackSignedUp("u1", { path: "/sign-up/email", headers });
    expect(track).toHaveBeenCalledWith("auth.signed_up", { method: "email" }, { distinctId: "u1", headers });
  });

  it("does not count admin impersonation as a sign-in", async () => {
    await trackSignedIn("u1", { path: "/admin/impersonate-user" });
    expect(track).not.toHaveBeenCalled();
    await trackSignedIn("u1", { path: "/callback/google" });
    expect(track).toHaveBeenCalledWith("auth.signed_in", { method: "google" }, { distinctId: "u1", headers: undefined });
  });
});
