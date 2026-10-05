import { describe, expect, it, vi } from "vitest";
import { assertServerEnv, findServerEnvIssues } from "@/lib/env";

const STRONG_SECRET = "s".repeat(40);

const baseEnv = {
  NODE_ENV: "production",
  NEXT_PUBLIC_URL: "https://example.com",
  DATABASE_URL: "postgresql://u:p@db:5432/app",
  BETTER_AUTH_SECRET: STRONG_SECRET,
};

describe("findServerEnvIssues", () => {
  it("accepts a minimal valid configuration", () => {
    expect(findServerEnvIssues(baseEnv)).toEqual([]);
  });

  it("requires core variables", () => {
    const issues = findServerEnvIssues({});
    expect(issues.map((i) => i.key)).toEqual(
      expect.arrayContaining(["NEXT_PUBLIC_URL", "DATABASE_URL", "BETTER_AUTH_SECRET"]),
    );
  });

  it("rejects malformed URLs", () => {
    const issues = findServerEnvIssues({
      ...baseEnv,
      NEXT_PUBLIC_URL: "example.com",
      DATABASE_URL: "mysql://u:p@db/app",
    });
    expect(issues.map((i) => i.key)).toEqual(["NEXT_PUBLIC_URL", "DATABASE_URL"]);
  });

  it.each(["change-me-before-production", "short"])(
    "rejects weak BETTER_AUTH_SECRET %s",
    (secret) => {
      const issues = findServerEnvIssues({ ...baseEnv, BETTER_AUTH_SECRET: secret });
      expect(issues.map((i) => i.key)).toEqual(["BETTER_AUTH_SECRET"]);
    },
  );

  // scaffold:begin ai_agents
  it("rejects the dev-only backend HMAC secret", () => {
    const issues = findServerEnvIssues({
      ...baseEnv,
      BACKEND_HMAC_SECRET: "dev-only-change-me-32bytes-hex0000",
    });
    expect(issues.map((i) => i.key)).toEqual(["BACKEND_HMAC_SECRET"]);
  });

  it("requires BACKEND_HMAC_SECRET only when BACKEND_URL is set", () => {
    expect(findServerEnvIssues(baseEnv)).toEqual([]);
    const issues = findServerEnvIssues({ ...baseEnv, BACKEND_URL: "http://backend:8000" });
    expect(issues.map((i) => i.key)).toEqual(["BACKEND_HMAC_SECRET"]);
  });
  // scaffold:end ai_agents

  it("requires credentials for enabled integrations", () => {
    const issues = findServerEnvIssues({
      ...baseEnv,
      NEXT_PUBLIC_AUTH_GOOGLE: "true",
      NEXT_PUBLIC_EMAIL_CLIENT: "resend",
      NEXT_PUBLIC_ALLOW_RATE_LIMIT: "upstash",
    });
    expect(issues.map((i) => i.key).sort()).toEqual(
      [
        "AUTH_GOOGLE_CLIENT_ID",
        "AUTH_GOOGLE_CLIENT_SECRET",
        "RESEND_API_KEY",
        "NEXT_PUBLIC_SUPPORT_MAIL",
        "UPSTASH_REDIS_REST_URL",
        "UPSTASH_REDIS_REST_TOKEN",
      ].sort(),
    );
  });

  // One case per provider, so a download that keeps only some still passes.
  it.each([
    // scaffold:begin payment_gateway.stripe
    ["NEXT_PUBLIC_PAYMENT_GATEWAY", "stripe", ["STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET"]],
    // scaffold:end payment_gateway.stripe
    // scaffold:begin payment_gateway.dodo
    ["NEXT_PUBLIC_PAYMENT_GATEWAY", "dodo", ["DODO_PAYMENTS_API_KEY", "DODO_PAYMENTS_WEBHOOK_KEY"]],
    // scaffold:end payment_gateway.dodo
    // scaffold:begin image_storage.vercel_blob
    ["NEXT_PUBLIC_IMAGE_STORAGE", "vercel_blob", ["BLOB_READ_WRITE_TOKEN"]],
    // scaffold:end image_storage.vercel_blob
    // scaffold:begin image_storage.cloudflare_r2
    ["NEXT_PUBLIC_IMAGE_STORAGE", "cloudflare_r2", ["R2_ACCOUNT_ID", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_BUCKET_NAME"]],
    // scaffold:end image_storage.cloudflare_r2
    // scaffold:begin cms.notion
    ["NEXT_PUBLIC_CMS", "notion", ["NOTION_API_TOKEN"]],
    // scaffold:end cms.notion
  ])("requires credentials when %s=%s", (toggle, value, keys) => {
    const issues = findServerEnvIssues({ ...baseEnv, [toggle as string]: value as string });
    expect(issues.map((i) => i.key).sort()).toEqual([...(keys as string[])].sort());
  });

  it("ignores credentials for disabled integrations", () => {
    expect(
      findServerEnvIssues({
        ...baseEnv,
        NEXT_PUBLIC_AUTH_GOOGLE: "false",
        NEXT_PUBLIC_EMAIL_CLIENT: "none",
        NEXT_PUBLIC_PAYMENT_GATEWAY: "none",
        NEXT_PUBLIC_CMS: "postgres",
      }),
    ).toEqual([]);
  });

  it.each([undefined, "", "none"])(
    "requires an email client when email sign-up is on (client %s)",
    (client) => {
      const issues = findServerEnvIssues({
        ...baseEnv,
        NEXT_PUBLIC_AUTH_EMAIL: "true",
        NEXT_PUBLIC_EMAIL_CLIENT: client,
      });
      expect(issues.map((i) => i.key)).toEqual(["NEXT_PUBLIC_EMAIL_CLIENT"]);
    },
  );

  it("accepts email sign-up with a configured client, and no client when it is off", () => {
    expect(
      findServerEnvIssues({
        ...baseEnv,
        NEXT_PUBLIC_AUTH_EMAIL: "true",
        NEXT_PUBLIC_EMAIL_CLIENT: "resend",
        RESEND_API_KEY: "re_123",
        NEXT_PUBLIC_SUPPORT_MAIL: "support@example.com",
      }),
    ).toEqual([]);
    expect(
      findServerEnvIssues({ ...baseEnv, NEXT_PUBLIC_AUTH_EMAIL: "false", NEXT_PUBLIC_EMAIL_CLIENT: "none" }),
    ).toEqual([]);
  });

  it("flags secrets exposed through NEXT_PUBLIC_ variables", () => {
    const issues = findServerEnvIssues({
      ...baseEnv,
      NEXT_PUBLIC_STRIPE_SECRET_KEY: "sk_live_x",
      NEXT_PUBLIC_GOOGLE_ANALYTICS_MEASUREMENT_ID: "G-123",
    });
    expect(issues.map((i) => i.key)).toEqual(["NEXT_PUBLIC_STRIPE_SECRET_KEY"]);
  });
});

describe("assertServerEnv", () => {
  it("throws in production when the environment is invalid", () => {
    expect(() =>
      assertServerEnv({ ...baseEnv, BETTER_AUTH_SECRET: "change-me-before-production" }),
    ).toThrow(/BETTER_AUTH_SECRET/);
  });

  it("only warns outside production", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(() => assertServerEnv({ NODE_ENV: "development" })).not.toThrow();
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("BETTER_AUTH_SECRET"));
    warn.mockRestore();
  });

  it("is silent for a valid production environment", () => {
    expect(() => assertServerEnv(baseEnv)).not.toThrow();
  });
});
