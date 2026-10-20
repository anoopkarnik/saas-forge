import { describe, it, expect } from "vitest";
import { buildGuestDemoData } from "./guestDemoData";

describe("buildGuestDemoData", () => {
  it("produces a guest user record", () => {
    const data = buildGuestDemoData();
    expect(data.user.role).toBe("guest");
    expect(data.user.email).toMatch(/@/);
  });
});
