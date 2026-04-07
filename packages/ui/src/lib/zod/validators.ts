import { z } from "zod";

const hasSelectedModule = (data: any, moduleId: string) =>
  Array.isArray(data.SELECTED_MODULES) && data.SELECTED_MODULES.includes(moduleId);

export const validatePlatform = (data: any, ctx: z.RefinementCtx) => {
  if (!data.NEXT_PUBLIC_PLATFORM.includes("web")) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Web App must be selected as it powers the backend.",
      path: ["NEXT_PUBLIC_PLATFORM"],
    });
  }
};

export const validateCMS = (data: any, ctx: z.RefinementCtx) => {
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
      if (!data[field] || data[field]!.trim() === "") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Required for Notion CMS",
          path: [field],
        });
      }
    });
  }

  if (data.NEXT_PUBLIC_CMS === "postgres") {
    const postgresFields = [
      "UPSTASH_REDIS_REST_URL",
      "UPSTASH_REDIS_REST_TOKEN"
    ] as const;

    postgresFields.forEach((field) => {
      if (!data[field] || data[field]!.trim() === "") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Required for Postgres CMS cache",
          path: [field],
        });
      }
    });

    if (!data.DATABASE_URL || data.DATABASE_URL.trim() === "") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Database URL is required when using Postgres CMS",
        path: ["DATABASE_URL"]
      });
    }
  }

  if (data.NEXT_PUBLIC_CMS === "strapi") {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Strapi support is coming soon. Please select Notion.",
      path: ["NEXT_PUBLIC_CMS"],
    });
  }
};

export const validateAuth = (data: any, ctx: z.RefinementCtx) => {
  if (data.NEXT_PUBLIC_EMAIL_CLIENT === "gmail_smtp") {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Gmail SMTP support is coming soon.",
      path: ["NEXT_PUBLIC_EMAIL_CLIENT"],
    });
  }

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
      if (!data.RESEND_API_KEY || data.RESEND_API_KEY!.trim() === "") {
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
      if (!data[field] || data[field]!.trim() === "") {
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
      if (!data[field] || data[field]!.trim() === "") {
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
      if (!data[field] || data[field]!.trim() === "") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Required for GitHub OAuth",
          path: [field],
        });
      }
    });
  }

  const betterAuthFields = ["BETTER_AUTH_SECRET"] as const;
  betterAuthFields.forEach((field) => {
    if (!data[field] || data[field]!.trim() === "") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Required for Better Auth",
        path: [field],
      });
    }
  });
};

export const validateSupport = (data: any, ctx: z.RefinementCtx) => {
  const supportFeatures = data.NEXT_PUBLIC_SUPPORT_FEATURES || [];

  if (supportFeatures.includes("support_mail")) {
    if (!data.NEXT_PUBLIC_SUPPORT_MAIL || data.NEXT_PUBLIC_SUPPORT_MAIL!.trim() === "") {
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
    if (!data.NEXT_PUBLIC_CALENDLY_BOOKING_URL || data.NEXT_PUBLIC_CALENDLY_BOOKING_URL!.trim() === "") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Calendly URL is required when Book Meeting is enabled.",
        path: ["NEXT_PUBLIC_CALENDLY_BOOKING_URL"],
      });
    }
  }
};

export const validateStorage = (data: any, ctx: z.RefinementCtx) => {
  if (data.NEXT_PUBLIC_IMAGE_STORAGE === "vercel_blob") {
    const cloudflareFields = ["BLOB_READ_WRITE_TOKEN"] as const;
    cloudflareFields.forEach((field) => {
      if (!data[field] || data[field]!.trim() === "") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Required for Vercel Blob",
          path: [field],
        });
      }
    });
  }

  if (data.NEXT_PUBLIC_IMAGE_STORAGE === "cloudflare_r2") {
    const cloudflareFields = [
      "R2_ACCOUNT_ID",
      "R2_ACCESS_KEY_ID",
      "R2_SECRET_ACCESS_KEY",
      "R2_BUCKET_NAME",
    ] as const;

    cloudflareFields.forEach((field) => {
      if (!data[field] || data[field]!.trim() === "") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Required for Cloudflare R2",
          path: [field],
        });
      }
    });
  }
};

export const validateObservability = (data: any, ctx: z.RefinementCtx) => {
  const observabilityFeatures = data.NEXT_PUBLIC_OBSERVABILITY_FEATURES || [];

  if (observabilityFeatures.includes("rate_limiting")) {
    if (!data.NEXT_PUBLIC_ALLOW_RATE_LIMIT) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Rate limiting provider is required when Rate Limiting is enabled.",
        path: ["NEXT_PUBLIC_ALLOW_RATE_LIMIT"],
      });
    }
  }
  
  if (data.NEXT_PUBLIC_ALLOW_RATE_LIMIT === "upstash") {
    const upstashFields = [
      "UPSTASH_REDIS_REST_URL",
      "UPSTASH_REDIS_REST_TOKEN",
    ] as const;

    upstashFields.forEach((field) => {
      if (!data[field] || data[field]!.trim() === "") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Required for Upstash",
          path: [field],
        });
      }
    });
  }
};

export const validatePayment = (data: any, ctx: z.RefinementCtx) => {
  if (!hasSelectedModule(data, "billing")) {
    return;
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
      if (!data[field] || data[field]!.trim() === "") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Required for Dodo Payments",
          path: [field],
        });
      }
    });
  }

  if (data.NEXT_PUBLIC_PAYMENT_GATEWAY === "stripe") {
    const stripeFields = [
      "STRIPE_SECRET_KEY",
      "STRIPE_WEBHOOK_SECRET",
    ] as const;

    stripeFields.forEach((field) => {
      if (!data[field] || data[field]!.trim() === "") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Required for Stripe Payments",
          path: [field],
        });
      }
    });
  }
};
