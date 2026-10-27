import { describe, expect, it } from "vitest";
import { textResponse } from "../http";

describe("textResponse", () => {
  it("lets the CDN cache feeds only briefly, so an unpublished post drops out within a minute", () => {
    const cacheControl = textResponse("ok", "text/plain").headers.get("Cache-Control")!;
    const maxAge = Number(/s-maxage=(\d+)/.exec(cacheControl)?.[1]);
    const stale = Number(/stale-while-revalidate=(\d+)/.exec(cacheControl)?.[1] ?? 0);

    expect(maxAge).toBeLessThanOrEqual(60);
    expect(stale).toBeLessThanOrEqual(60);
  });

  it("never caches a 404, so a newly published post's markdown is reachable at once", () => {
    expect(textResponse("Not found\n", "text/plain", 404).headers.get("Cache-Control")).toBe("no-store");
  });
});
