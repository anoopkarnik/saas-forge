import { describe, it, expect } from "vitest";
import { isGuestAccountMutation, GUEST_BLOCKED_PATHS } from "./guestGuard";

describe("isGuestAccountMutation", () => {
  it.each(GUEST_BLOCKED_PATHS)("blocks %s", (path) => {
    expect(isGuestAccountMutation(path)).toBe(true);
  });

  it("ignores read/session paths", () => {
    expect(isGuestAccountMutation("/get-session")).toBe(false);
    expect(isGuestAccountMutation("/sign-out")).toBe(false);
    expect(isGuestAccountMutation("/account-info")).toBe(false);
    expect(isGuestAccountMutation("/list-accounts")).toBe(false);
  });
});
