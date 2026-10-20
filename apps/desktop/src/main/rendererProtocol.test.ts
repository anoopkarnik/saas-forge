import { join } from "path";
import { describe, expect, it } from "vitest";
import { DESKTOP_APP_ORIGIN } from "@workspace/auth/better-auth/desktop-origin";
import {
  RENDERER_ORIGIN,
  rendererPageUrl,
  resolveRendererFile,
} from "./rendererProtocol";

const rendererDir = join("/opt", "app", "renderer");

describe("renderer protocol", () => {
  it("matches the origin the web API trusts", () => {
    expect(RENDERER_ORIGIN).toBe(DESKTOP_APP_ORIGIN);
  });

  it("builds page URLs with an optional hash route", () => {
    expect(rendererPageUrl()).toBe("app://saas-forge/index.html");
    expect(rendererPageUrl("/auth-callback")).toBe(
      "app://saas-forge/index.html#/auth-callback",
    );
  });

  it("serves files from the renderer directory", () => {
    expect(resolveRendererFile(rendererDir, "app://saas-forge/")).toBe(
      join(rendererDir, "index.html"),
    );
    expect(
      resolveRendererFile(rendererDir, "app://saas-forge/assets/index-abc.js"),
    ).toBe(join(rendererDir, "assets", "index-abc.js"));
  });

  it("keeps dot segments inside the renderer directory", () => {
    // The URL parser clamps ../ (plain or %2e-encoded) at the root.
    for (const url of [
      "app://saas-forge/../main/index.js",
      "app://saas-forge/%2e%2e/main/index.js",
    ]) {
      expect(resolveRendererFile(rendererDir, url)).toBe(
        join(rendererDir, "main", "index.js"),
      );
    }
  });

  it("refuses encoded-slash paths that would escape the renderer directory", () => {
    expect(
      resolveRendererFile(rendererDir, "app://saas-forge/..%2F..%2Fetc/passwd"),
    ).toBeNull();
  });

  it("refuses other hosts and schemes", () => {
    expect(resolveRendererFile(rendererDir, "app://evil/index.html")).toBeNull();
    expect(resolveRendererFile(rendererDir, "file:///etc/passwd")).toBeNull();
    expect(resolveRendererFile(rendererDir, "not a url")).toBeNull();
  });
});
