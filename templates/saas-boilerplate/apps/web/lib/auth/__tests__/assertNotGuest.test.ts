import { describe, it, expect } from "vitest";
import { assertNotGuest } from "../assertNotGuest";

describe("assertNotGuest", () => {
  it("returns a 403 response for guest sessions", async () => {
    const res = assertNotGuest({ user: { role: "guest" } });
    expect(res).not.toBeNull();
    expect(res!.status).toBe(403);
    expect(await res!.json()).toEqual({ error: "This is a read-only demo account." });
  });

  it("returns null for admins", () => {
    expect(assertNotGuest({ user: { role: "admin" } })).toBeNull();
  });

  it("returns null for regular users", () => {
    expect(assertNotGuest({ user: { role: "user" } })).toBeNull();
  });

  it("returns null when there is no session", () => {
    expect(assertNotGuest(null)).toBeNull();
  });
});
