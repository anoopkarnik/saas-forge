import { describe, expect, it } from "vitest";
import { isEmailAllowedToRegister } from "./registration";

const now = new Date("2026-08-02T00:00:00Z");
const future = new Date("2026-08-09T00:00:00Z");
const past = new Date("2026-07-30T00:00:00Z");

describe("isEmailAllowedToRegister", () => {
  it("allows anyone when mode is OPEN", () => {
    expect(isEmailAllowedToRegister("OPEN", null, now)).toBe(true);
  });

  it("blocks when INVITE_ONLY and no invite", () => {
    expect(isEmailAllowedToRegister("INVITE_ONLY", null, now)).toBe(false);
  });

  it("allows when INVITE_ONLY and a pending, non-expired invite exists", () => {
    expect(
      isEmailAllowedToRegister("INVITE_ONLY", { status: "PENDING", expiresAt: future }, now),
    ).toBe(true);
  });

  it("blocks when INVITE_ONLY and invite is expired", () => {
    expect(
      isEmailAllowedToRegister("INVITE_ONLY", { status: "PENDING", expiresAt: past }, now),
    ).toBe(false);
  });

  it("blocks when INVITE_ONLY and invite is not pending", () => {
    expect(
      isEmailAllowedToRegister("INVITE_ONLY", { status: "REVOKED", expiresAt: future }, now),
    ).toBe(false);
    expect(
      isEmailAllowedToRegister("INVITE_ONLY", { status: "ACCEPTED", expiresAt: future }, now),
    ).toBe(false);
  });
});
