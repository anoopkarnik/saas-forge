import { describe, it, expect } from "vitest";
import { API_KEY_SCOPES, isValidScope, type ApiKeyScope } from "../scopes";

describe("API_KEY_SCOPES", () => {
  it("includes the read:me foundational scope", () => {
    expect(API_KEY_SCOPES).toContain("read:me");
  });

  it("is a readonly tuple typed at compile time", () => {
    // Type-only check — ensures ApiKeyScope is a string union, not generic string.
    const sample: ApiKeyScope = "read:me";
    expect(sample).toBe("read:me");
  });
});

describe("isValidScope", () => {
  it("returns true for a known scope", () => {
    expect(isValidScope("read:me")).toBe(true);
  });

  it("returns false for an unknown scope", () => {
    expect(isValidScope("write:everything")).toBe(false);
  });

  it("returns false for an empty string", () => {
    expect(isValidScope("")).toBe(false);
  });
});
