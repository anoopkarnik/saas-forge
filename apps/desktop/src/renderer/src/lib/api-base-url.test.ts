import { describe, expect, it } from "vitest";
import { buildTrpcUrl, normalizeApiBaseUrl } from "./api-base-url";

describe("desktop API base URL helpers", () => {
  it("defaults to the local web origin when unset", () => {
    expect(normalizeApiBaseUrl()).toBe("http://localhost:3000");
    expect(buildTrpcUrl()).toBe("http://localhost:3000/api/trpc");
  });

  it("keeps bare origins intact", () => {
    expect(normalizeApiBaseUrl("https://example.com")).toBe(
      "https://example.com",
    );
    expect(buildTrpcUrl("https://example.com")).toBe(
      "https://example.com/api/trpc",
    );
  });

  it("trims an accidentally duplicated tRPC suffix", () => {
    expect(normalizeApiBaseUrl("http://localhost:3000/api/trpc")).toBe(
      "http://localhost:3000",
    );
    expect(buildTrpcUrl("http://localhost:3000/api/trpc")).toBe(
      "http://localhost:3000/api/trpc",
    );
  });
});
