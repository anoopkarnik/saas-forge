import { describe, it, expect } from "vitest";
import { generateApiKey, hashApiKey, parseAuthHeader } from "../hash";

describe("generateApiKey", () => {
  it("returns a plaintext key, prefix, and hash", () => {
    const result = generateApiKey();
    expect(result.plaintext).toMatch(/^sk_[A-Za-z0-9]{10}_[A-Za-z0-9]{32}$/);
    expect(result.prefix).toMatch(/^sk_[A-Za-z0-9]{10}$/);
    expect(result.hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it("prefix matches the first 13 chars of plaintext", () => {
    const { plaintext, prefix } = generateApiKey();
    expect(plaintext.slice(0, 13)).toBe(prefix);
  });

  it("generates unique keys across calls", () => {
    const a = generateApiKey();
    const b = generateApiKey();
    expect(a.plaintext).not.toBe(b.plaintext);
    expect(a.prefix).not.toBe(b.prefix);
  });
});

describe("hashApiKey", () => {
  it("is deterministic", () => {
    expect(hashApiKey("sk_test")).toBe(hashApiKey("sk_test"));
  });

  it("returns a 64-char lowercase hex string", () => {
    expect(hashApiKey("sk_test")).toMatch(/^[a-f0-9]{64}$/);
  });

  it("changes with input", () => {
    expect(hashApiKey("a")).not.toBe(hashApiKey("b"));
  });
});

describe("parseAuthHeader", () => {
  it("extracts the token from a well-formed Bearer header", () => {
    expect(parseAuthHeader("Bearer sk_abc_def")).toEqual({
      ok: true,
      token: "sk_abc_def",
    });
  });

  it("accepts lowercase bearer", () => {
    expect(parseAuthHeader("bearer sk_abc_def")).toEqual({
      ok: true,
      token: "sk_abc_def",
    });
  });

  it("rejects missing header (null)", () => {
    expect(parseAuthHeader(null)).toEqual({
      ok: false,
      reason: "missing",
    });
  });

  it("rejects header missing 'Bearer ' prefix", () => {
    expect(parseAuthHeader("sk_abc_def")).toEqual({
      ok: false,
      reason: "format",
    });
  });

  it("rejects token that doesn't start with sk_", () => {
    expect(parseAuthHeader("Bearer notakey")).toEqual({
      ok: false,
      reason: "format",
    });
  });
});
