import { z } from 'zod';
import { 
  validatePlatform, validateCMS, validateAuth, 
  validateSupport, validateStorage, validateObservability, validatePayment 
} from './validators';

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
  NEXT_PUBLIC_PLATFORM: z.array(z.enum(["web", "mobile", "desktop"])).min(1, "Select at least one platform"),

  // Landing Module Variables
  NEXT_PUBLIC_CMS: z.enum(['constant', 'postgres', 'notion', 'strapi']),
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
  NEXT_PUBLIC_EMAIL_CLIENT: z.enum(["none", "resend", "gmail_smtp"]),
  RESEND_API_KEY: z.string().optional(),

  // Support Module Variables
  NEXT_PUBLIC_SUPPORT_FEATURES: z.array(z.enum(["support_mail", "calendly"])).optional(),
  NEXT_PUBLIC_SUPPORT_MAIL: z.string().optional(),
  NEXT_PUBLIC_CALENDLY_BOOKING_URL: z.string().optional(),

  // Storage Module Variables
  NEXT_PUBLIC_IMAGE_STORAGE: z.enum(["vercel_blob", "cloudflare_r2"]),
  BLOB_READ_WRITE_TOKEN: z.string().optional(),
  R2_ACCOUNT_ID: z.string().optional(),
  R2_ACCESS_KEY_ID: z.string().optional(),
  R2_SECRET_ACCESS_KEY: z.string().optional(),
  R2_BUCKET_NAME: z.string().optional(),
  NEXT_PUBLIC_R2_PUBLIC_URL: z.string().optional(),
  DATABASE_URL: z.string(),

  // Observability Module Variables
  NEXT_PUBLIC_OBSERVABILITY_FEATURES: z.array(z.enum(["logging", "google_analytics", "rate_limiting"])).optional(),
  BETTERSTACK_TELEMETRY_SOURCE_TOKEN: z.string().optional(),
  BETTERSTACK_TELEMETRY_INGESTING_HOST: z.string().optional(),
  NEXT_PUBLIC_GOOGLE_ANALYTICS_MEASUREMENT_ID: z.string().optional(),
  NEXT_PUBLIC_ALLOW_RATE_LIMIT: z.enum(["upstash"]).optional(),

  // Payment Module Variables
  NEXT_PUBLIC_PAYMENT_GATEWAY: z.enum(['none', 'dodo', 'stripe']),
  DODO_PAYMENTS_API_KEY: z.string().optional(),
  DODO_PAYMENTS_WEBHOOK_KEY: z.string().optional(),
  DODO_PAYMENTS_RETURN_URL: z.string().optional(),
  DODO_PAYMENTS_ENVIRONMENT: z.string().optional(),
  DODO_CREDITS_PRODUCT_ID: z.string().optional(),
  NEXT_PUBLIC_DODO_PAYMENTS_URL: z.string().optional(),
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
}).superRefine((data, ctx) => {
  validatePlatform(data, ctx);
  validateCMS(data, ctx);
  validateAuth(data, ctx);
  validateSupport(data, ctx);
  validateStorage(data, ctx);
  validateObservability(data, ctx);
  validatePayment(data, ctx);
});

export type FormValues = z.infer<typeof formSchema>;