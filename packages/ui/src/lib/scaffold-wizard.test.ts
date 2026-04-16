import { describe, expect, it } from "vitest";

import type { FormValues } from "./zod/download";
import {
  getAccountsProviderGroups,
  getReviewSummaryItems,
  getWizardStepFields,
} from "./scaffold-wizard";

function createValues(
  overrides: Partial<FormValues> = {},
): FormValues {
  return {
    name: "starter",
    NEXT_PUBLIC_THEME: "neutral",
    NEXT_PUBLIC_THEME_TYPE: "system",
    SELECTED_MODULES: [],
    NEXT_PUBLIC_SAAS_NAME: "Starter",
    NEXT_PUBLIC_COMPANY_NAME: "Acme",
    NEXT_PUBLIC_URL: "https://starter.example",
    NEXT_PUBLIC_PLATFORM: ["web"],
    NEXT_PUBLIC_CMS: "constant",
    LANDING_DATABASE_ID: "",
    HERO_DATABASE_ID: "",
    FEATURE_DATABASE_ID: "",
    TESTIMONIAL_DATABASE_ID: "",
    PRICING_DATABASE_ID: "",
    FAQ_DATABASE_ID: "",
    FOOTER_DATABASE_ID: "",
    DOCUMENTATION_DATABASE_ID: "",
    NOTION_API_TOKEN: "",
    UPSTASH_REDIS_REST_URL: "",
    UPSTASH_REDIS_REST_TOKEN: "",
    NEXT_PUBLIC_AUTH_FRAMEWORK: "better-auth",
    BETTER_AUTH_SECRET: "",
    NEXT_PUBLIC_AUTH_PROVIDERS: ["github"],
    AUTH_LINKEDIN_CLIENT_ID: "",
    AUTH_LINKEDIN_CLIENT_SECRET: "",
    AUTH_GITHUB_CLIENT_ID: "",
    AUTH_GITHUB_CLIENT_SECRET: "",
    AUTH_GOOGLE_CLIENT_ID: "",
    AUTH_GOOGLE_CLIENT_SECRET: "",
    NEXT_PUBLIC_EMAIL_CLIENT: "none",
    RESEND_API_KEY: "",
    NEXT_PUBLIC_SUPPORT_FEATURES: [],
    NEXT_PUBLIC_SUPPORT_MAIL: "",
    NEXT_PUBLIC_CALENDLY_BOOKING_URL: "",
    NEXT_PUBLIC_IMAGE_STORAGE: "vercel_blob",
    BLOB_READ_WRITE_TOKEN: "",
    R2_ACCOUNT_ID: "",
    R2_ACCESS_KEY_ID: "",
    R2_SECRET_ACCESS_KEY: "",
    R2_BUCKET_NAME: "",
    NEXT_PUBLIC_R2_PUBLIC_URL: "",
    DATABASE_URL: "",
    NEXT_PUBLIC_OBSERVABILITY_FEATURES: [],
    BETTERSTACK_TELEMETRY_SOURCE_TOKEN: "",
    BETTERSTACK_TELEMETRY_INGESTING_HOST: "",
    NEXT_PUBLIC_GOOGLE_ANALYTICS_MEASUREMENT_ID: "",
    GA4_PROPERTY_ID: "",
    GA4_CREDENTIALS_JSON: "",
    GOOGLE_PAGESPEED_API_KEY: "",
    NEXT_PUBLIC_ALLOW_RATE_LIMIT: "upstash",
    NEXT_PUBLIC_PAYMENT_GATEWAY: "none",
    DODO_PAYMENTS_API_KEY: "",
    DODO_PAYMENTS_WEBHOOK_KEY: "",
    DODO_PAYMENTS_RETURN_URL: "",
    DODO_PAYMENTS_ENVIRONMENT: "",
    DODO_CREDITS_PRODUCT_ID: "",
    NEXT_PUBLIC_DODO_PAYMENTS_URL: "",
    NEXT_PUBLIC_AI_ENABLED: "false",
    AI_GATEWAY_API_KEY: "",
    OPENAI_API_KEY: "",
    ANTHROPIC_API_KEY: "",
    GOOGLE_GENERATIVE_AI_API_KEY: "",
    OPENROUTER_API_KEY: "",
    OLLAMA_BASE_URL: "",
    OPENAI_COMPATIBLE_BASE_URL: "",
    STRIPE_SECRET_KEY: "",
    STRIPE_WEBHOOK_SECRET: "",
    ...overrides,
  };
}

describe("scaffold wizard helpers", () => {
  it("returns the basics step fields in the expected order", () => {
    const fields = getWizardStepFields("basics", createValues());
    expect(fields).toEqual([
      "name",
      "NEXT_PUBLIC_SAAS_NAME",
      "NEXT_PUBLIC_COMPANY_NAME",
      "NEXT_PUBLIC_URL",
      "NEXT_PUBLIC_THEME",
      "NEXT_PUBLIC_THEME_TYPE",
      "NEXT_PUBLIC_PLATFORM",
    ]);
  });

  it("shows only relevant provider groups for a simple starter", () => {
    const groups = getAccountsProviderGroups(
      createValues({ NEXT_PUBLIC_CMS: "constant" }),
    );
    expect(groups.map((group) => group.id)).toEqual([
      "database",
      "auth",
      "storage",
    ]);
  });

  it("adds notion, upstash, resend, and payments groups when those capabilities are enabled", () => {
    const groups = getAccountsProviderGroups(
      createValues({
        NEXT_PUBLIC_CMS: "notion",
        NEXT_PUBLIC_AUTH_PROVIDERS: ["email_verification", "google"],
        NEXT_PUBLIC_EMAIL_CLIENT: "resend",
        NEXT_PUBLIC_OBSERVABILITY_FEATURES: ["rate_limiting"],
        SELECTED_MODULES: ["billing"],
        NEXT_PUBLIC_PAYMENT_GATEWAY: "stripe",
      }),
    );

    expect(groups.map((group) => group.id)).toEqual([
      "database",
      "notion",
      "upstash",
      "auth",
      "resend",
      "storage",
      "analytics",
      "payments",
    ]);
  });

  it("adds GA4 report and PageSpeed fields when those monitoring features are enabled", () => {
    const groups = getAccountsProviderGroups(
      createValues({
        NEXT_PUBLIC_OBSERVABILITY_FEATURES: [
          "google_analytics",
          "ga4_reports",
          "pagespeed_insights",
        ],
      }),
    );

    expect(groups.find((group) => group.id === "analytics")?.fields).toEqual([
      "NEXT_PUBLIC_GOOGLE_ANALYTICS_MEASUREMENT_ID",
      "GA4_PROPERTY_ID",
      "GA4_CREDENTIALS_JSON",
      "GOOGLE_PAGESPEED_API_KEY",
    ]);
  });

  it("summarizes billing as not included when the billing module is off", () => {
    const review = getReviewSummaryItems(createValues());
    expect(review.find((item) => item.label === "Payments")?.value).toBe(
      "Not included",
    );
  });

  it("shows AI provider group when AI module is selected and enabled", () => {
    const groups = getAccountsProviderGroups(
      createValues({
        SELECTED_MODULES: ["ai"],
        NEXT_PUBLIC_AI_ENABLED: "true",
      }),
    );

    const aiGroup = groups.find((group) => group.id === "ai");
    expect(aiGroup).toBeDefined();
    expect(aiGroup?.fields).toEqual([
      "NEXT_PUBLIC_AI_ENABLED",
      "OPENAI_API_KEY",
      "ANTHROPIC_API_KEY",
      "GOOGLE_GENERATIVE_AI_API_KEY",
      "OPENROUTER_API_KEY",
      "AI_GATEWAY_API_KEY",
      "OLLAMA_BASE_URL",
      "OPENAI_COMPATIBLE_BASE_URL",
    ]);
  });

  it("shows only NEXT_PUBLIC_AI_ENABLED when AI module is selected but not enabled", () => {
    const groups = getAccountsProviderGroups(
      createValues({
        SELECTED_MODULES: ["ai"],
        NEXT_PUBLIC_AI_ENABLED: "false",
      }),
    );

    const aiGroup = groups.find((group) => group.id === "ai");
    expect(aiGroup).toBeDefined();
    expect(aiGroup?.fields).toEqual(["NEXT_PUBLIC_AI_ENABLED"]);
  });

  it("hides AI provider group when AI module is not selected", () => {
    const groups = getAccountsProviderGroups(
      createValues({ SELECTED_MODULES: [] }),
    );

    expect(groups.find((group) => group.id === "ai")).toBeUndefined();
  });

  it("summarizes AI as not included when the AI module is off", () => {
    const review = getReviewSummaryItems(createValues());
    expect(review.find((item) => item.label === "AI")?.value).toBe(
      "Not included",
    );
  });

  it("summarizes AI as enabled when the AI module is selected and enabled", () => {
    const review = getReviewSummaryItems(
      createValues({
        SELECTED_MODULES: ["ai"],
        NEXT_PUBLIC_AI_ENABLED: "true",
      }),
    );
    expect(review.find((item) => item.label === "AI")?.value).toBe("Enabled");
  });

  it("summarizes AI as included but not enabled when module selected with AI disabled", () => {
    const review = getReviewSummaryItems(
      createValues({
        SELECTED_MODULES: ["ai"],
        NEXT_PUBLIC_AI_ENABLED: "false",
      }),
    );
    expect(review.find((item) => item.label === "AI")?.value).toBe(
      "Module included, not enabled yet",
    );
  });
});
