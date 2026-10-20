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

describe("isGuestAccountMutation — organization endpoints", () => {
  it.each([
    "/organization/create",
    "/organization/update",
    "/organization/delete",
    "/organization/invite-member",
    "/organization/cancel-invitation",
    "/organization/accept-invitation",
    "/organization/reject-invitation",
    "/organization/remove-member",
    "/organization/update-member-role",
    "/organization/leave",
  ])("blocks %s", (path) => {
    expect(isGuestAccountMutation(path)).toBe(true);
  });

  it("allows organization reads and switching", () => {
    expect(isGuestAccountMutation("/organization/list")).toBe(false);
    expect(isGuestAccountMutation("/organization/get-full-organization")).toBe(false);
    expect(isGuestAccountMutation("/organization/set-active")).toBe(false);
  });
});
