import { z } from 'zod';

export const formSchema = z.object({
  // Project name (folder name)
  name: z
    .string()
    .min(1, "Project name is required")
    .max(80, "Keep it under 80 characters")
    .regex(/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/, "Use letters, numbers, dot, underscore, or hyphen"),

  // Project Settings Variables
  NEXT_PUBLIC_THEME: z.enum(["blue", "green", "neutral", "orange", "red", "rose", "violet", "yellow"]),
  NEXT_PUBLIC_THEME_TYPE: z.enum(["light", "dark", "system"]),
  NEXT_PUBLIC_SAAS_NAME: z.string(),
  NEXT_PUBLIC_COMPANY_NAME: z.string(),
  NEXT_PUBLIC_URL: z.string(),

  // Landing Module Variables
  NEXT_PUBLIC_CMS: z.enum(['notion', 'strapi']),
  LANDING_DATABASE_ID: z.string().optional(),
  HERO_DATABASE_ID: z.string().optional(),
  FEATURE_DATABASE_ID: z.string().optional(),
  TESTIMONIAL_DATABASE_ID: z.string().optional(),
  PRICING_DATABASE_ID: z.string().optional(),
  FAQ_DATABASE_ID: z.string().optional(),
  FOOTER_DATABASE_ID: z.string().optional(),
  DOCUMENTATION_DATABASE_ID: z.string().optional(),
  NOTION_API_TOKEN: z.string().optional(),
  UPSTASH_REDIS_REST_URL: z.string().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),

  // Authentication Module Variables
  NEXT_PUBLIC_AUTH_FRAMEWORK: z.enum(['better-auth']),
  BETTER_AUTH_SECRET: z.string().optional(),
  NEXT_PUBLIC_AUTH_PROVIDERS: z.array(z.enum(["email_verification", "linkedin", "google", "github"])).min(1, "Select at least one auth provider"),
  AUTH_LINKEDIN_CLIENT_ID: z.string().optional(),
  AUTH_LINKEDIN_CLIENT_SECRET: z.string().optional(),
  AUTH_GITHUB_CLIENT_ID: z.string().optional(),
  AUTH_GITHUB_CLIENT_SECRET: z.string().optional(),
  AUTH_GOOGLE_CLIENT_ID: z.string().optional(),
  AUTH_GOOGLE_CLIENT_SECRET: z.string().optional(),
  NEXT_PUBLIC_EMAIL_CLIENT: z.enum(["none", "resend"]),
  RESEND_API_KEY: z.string().optional(),

  // Support Module Variables
  NEXT_PUBLIC_SUPPORT_FEATURES: z.array(z.enum(["support_mail", "calendly"])).optional(),
  NEXT_PUBLIC_SUPPORT_MAIL: z.string().optional(),
  NEXT_PUBLIC_CALENDLY_BOOKING_URL: z.string().optional(),

  // Storage Module Variables
  NEXT_PUBLIC_IMAGE_STORAGE: z.enum(["vercel_blob", "cloudflare_r2"]),
  BLOB_READ_WRITE_TOKEN: z.string().optional(),
  DATABASE_URL: z.string(),

  // Observability Module Variables
  NEXT_PUBLIC_OBSERVABILITY_FEATURES: z.array(z.enum(["logging", "google_analytics", "rate_limiting"])).min(1, "Select at least one observability feature"),
  BETTERSTACK_TELEMETRY_SOURCE_TOKEN: z.string().optional(),
  BETTERSTACK_TELEMETRY_INGESTING_HOST: z.string().optional(),
  NEXT_PUBLIC_GOOGLE_ANALYTICS_MEASUREMENT_ID: z.string().optional(),
  NEXT_PUBLIC_ALLOW_RATE_LIMIT: z.enum(["upstash"]),

  // Payment Module Variables
  NEXT_PUBLIC_PAYMENT_GATEWAY: z.enum(['none', 'dodo', 'stripe']),
  DODO_PAYMENTS_API_KEY: z.string().optional(),
  DODO_PAYMENTS_WEBHOOK_KEY: z.string().optional(),
  DODO_PAYMENTS_RETURN_URL: z.string().optional(),
  DODO_PAYMENTS_ENVIRONMENT: z.string().optional(),
  DODO_CREDITS_PRODUCT_ID: z.string().optional(),
  NEXT_PUBLIC_DODO_PAYMENTS_URL: z.string().optional(),
}).superRefine((data, ctx) => {
  if (data.NEXT_PUBLIC_CMS === "notion") {
    const notionFields = [
      "LANDING_DATABASE_ID",
      "HERO_DATABASE_ID",
      "FEATURE_DATABASE_ID",
      "TESTIMONIAL_DATABASE_ID",
      "PRICING_DATABASE_ID",
      "FAQ_DATABASE_ID",
      "FOOTER_DATABASE_ID",
      "DOCUMENTATION_DATABASE_ID",
      "NOTION_API_TOKEN",
      "UPSTASH_REDIS_REST_URL",
      "UPSTASH_REDIS_REST_TOKEN"
    ] as const;

    notionFields.forEach((field) => {
      if (!data[field] || data[field]?.trim() === "") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Required for Notion CMS",
          path: [field],
        });
      }
    });
  }

  if (data.NEXT_PUBLIC_CMS === "strapi") {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Strapi support is coming soon. Please select Notion.",
      path: ["NEXT_PUBLIC_CMS"],
    });
  }

  if (data.NEXT_PUBLIC_PAYMENT_GATEWAY === "dodo") {
    const dodoFields = [
      "DODO_PAYMENTS_API_KEY",
      "DODO_PAYMENTS_WEBHOOK_KEY",
      "DODO_PAYMENTS_RETURN_URL",
      "DODO_PAYMENTS_ENVIRONMENT",
      "DODO_CREDITS_PRODUCT_ID",
      "NEXT_PUBLIC_DODO_PAYMENTS_URL"
    ] as const;

    dodoFields.forEach((field) => {
      if (!data[field] || data[field]?.trim() === "") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Required for Dodo Payments",
          path: [field],
        });
      }
    });
  }

  if (data.NEXT_PUBLIC_PAYMENT_GATEWAY === "stripe") {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Stripe support is coming soon. Please select Dodo Payments.",
      path: ["NEXT_PUBLIC_PAYMENT_GATEWAY"],
    });
  }

  if (data.NEXT_PUBLIC_IMAGE_STORAGE === "vercel_blob") {
    const cloudflareFields = [
      "BLOB_READ_WRITE_TOKEN",
    ] as const;

    cloudflareFields.forEach((field) => {
      if (!data[field] || data[field]?.trim() === "") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Required for Vercel Blob",
          path: [field],
        });
      }
    });
  }

  if (data.NEXT_PUBLIC_IMAGE_STORAGE === "cloudflare_r2") {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Cloudflare R2 support is coming soon. Please select Vercel Blob.",
      path: ["NEXT_PUBLIC_IMAGE_STORAGE"],
    });
  }

  if (data.NEXT_PUBLIC_ALLOW_RATE_LIMIT === "upstash") {
    const upstashFields = [
      "UPSTASH_REDIS_REST_URL",
      "UPSTASH_REDIS_REST_TOKEN",
    ] as const;

    upstashFields.forEach((field) => {
      if (!data[field] || data[field]?.trim() === "") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Required for Upstash",
          path: [field],
        });
      }
    });
  }

  // Support mail requires an email client
  const supportFeatures = data.NEXT_PUBLIC_SUPPORT_FEATURES || [];

  if (supportFeatures.includes("support_mail")) {
    if (!data.NEXT_PUBLIC_SUPPORT_MAIL || data.NEXT_PUBLIC_SUPPORT_MAIL.trim() === "") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Support email is required when Send Message is enabled.",
        path: ["NEXT_PUBLIC_SUPPORT_MAIL"],
      });
    }
    if (!data.NEXT_PUBLIC_EMAIL_CLIENT || data.NEXT_PUBLIC_EMAIL_CLIENT === "none") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "An email client is required when a support email is provided. Please select one.",
        path: ["NEXT_PUBLIC_EMAIL_CLIENT"],
      });
    }
  }

  if (supportFeatures.includes("calendly")) {
    if (!data.NEXT_PUBLIC_CALENDLY_BOOKING_URL || data.NEXT_PUBLIC_CALENDLY_BOOKING_URL.trim() === "") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Calendly URL is required when Book Meeting is enabled.",
        path: ["NEXT_PUBLIC_CALENDLY_BOOKING_URL"],
      });
    }
  }

  // Auth provider-specific validations
  const providers = data.NEXT_PUBLIC_AUTH_PROVIDERS || [];

  if (providers.includes("email_verification")) {
    if (!data.NEXT_PUBLIC_EMAIL_CLIENT || data.NEXT_PUBLIC_EMAIL_CLIENT === "none") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "An email client is required when Email Verification is enabled. Please select one.",
        path: ["NEXT_PUBLIC_EMAIL_CLIENT"],
      });
    }
    if (data.NEXT_PUBLIC_EMAIL_CLIENT === "resend") {
      if (!data.RESEND_API_KEY || data.RESEND_API_KEY.trim() === "") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Required for Resend",
          path: ["RESEND_API_KEY"],
        });
      }
    }
  }

  if (providers.includes("linkedin")) {
    (["AUTH_LINKEDIN_CLIENT_ID", "AUTH_LINKEDIN_CLIENT_SECRET"] as const).forEach((field) => {
      if (!data[field] || data[field]?.trim() === "") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Required for LinkedIn OAuth",
          path: [field],
        });
      }
    });
  }

  if (providers.includes("google")) {
    (["AUTH_GOOGLE_CLIENT_ID", "AUTH_GOOGLE_CLIENT_SECRET"] as const).forEach((field) => {
      if (!data[field] || data[field]?.trim() === "") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Required for Google OAuth",
          path: [field],
        });
      }
    });
  }

  if (providers.includes("github")) {
    (["AUTH_GITHUB_CLIENT_ID", "AUTH_GITHUB_CLIENT_SECRET"] as const).forEach((field) => {
      if (!data[field] || data[field]?.trim() === "") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Required for GitHub OAuth",
          path: [field],
        });
      }
    });
  }

  if (data.NEXT_PUBLIC_AUTH_FRAMEWORK === "better-auth") {
    const betterAuthFields = [
      "BETTER_AUTH_SECRET",
    ] as const;

    betterAuthFields.forEach((field) => {
      if (!data[field] || data[field]?.trim() === "") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Required for Better Auth",
          path: [field],
        });
      }
    });
  }

  // Observability validations
  const observabilityFeatures = data.NEXT_PUBLIC_OBSERVABILITY_FEATURES || [];

  if (observabilityFeatures.includes("logging")) {
    (["BETTERSTACK_TELEMETRY_SOURCE_TOKEN", "BETTERSTACK_TELEMETRY_INGESTING_HOST"] as const).forEach((field) => {
      // These are optional in schema but should probably be filled if logging is selected. 
      // However, user might just want the toggle without values initially. 
      // Leaving as optional for now to match current behavior where they are optional strings.
    });
  }

  if (observabilityFeatures.includes("rate_limiting")) {
    if (!data.NEXT_PUBLIC_ALLOW_RATE_LIMIT) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Rate limiting provider is required when Rate Limiting is enabled.",
        path: ["NEXT_PUBLIC_ALLOW_RATE_LIMIT"],
      });
    }
  }
});

export type FormValues = z.infer<typeof formSchema>;