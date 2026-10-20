// @vitest-environment node
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it, vi } from "vitest";

// The starter ships its own next.config.mjs (a template override), so changes
// to the root config do not reach downloads. getTranslations() fails at
// request time unless the next-intl plugin points at i18n/request.ts.
const repoRoot = fileURLToPath(new URL("../../../../..", import.meta.url));
const starterConfig = path.join(
  repoRoot,
  "template-overrides/saas-boilerplate/apps/web/next.config.mjs",
);

describe("starter next.config.mjs", () => {
  it("wires the next-intl request config", async () => {
    vi.stubEnv("TURBOPACK", "1");
    const config = (await import(/* @vite-ignore */ starterConfig)).default as {
      turbopack?: { resolveAlias?: Record<string, string> };
      transpilePackages?: string[];
    };
    vi.unstubAllEnvs();

    expect(config.turbopack?.resolveAlias?.["next-intl/config"]).toBe("./i18n/request.ts");
    expect(config.transpilePackages).toContain("@workspace/i18n");
  });
});
