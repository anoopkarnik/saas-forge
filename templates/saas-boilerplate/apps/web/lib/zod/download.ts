import {z} from  'zod';

export const formSchema = z.object({
  // Project name (folder name)
  name: z
    .string()
    .min(1, "Project name is required")
    .max(80, "Keep it under 80 characters")
    .regex(/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/, "Use letters, numbers, dot, underscore, or hyphen"),

  // Project Settings Variables
  NEXT_PUBLIC_THEME: z.string().optional(),
  NEXT_PUBLIC_SAAS_NAME: z.string().optional(),
  NEXT_PUBLIC_COMPANY_NAME: z.string().optional(),
  NEXT_PUBLIC_URL: z.string().optional(),

  // Landing Module Variables
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
  BETTER_AUTH_SECRET: z.string().optional(),
  AUTH_LINKEDIN_CLIENT_ID: z.string().optional(),
  AUTH_LINKEDIN_CLIENT_SECRET: z.string().optional(),
  AUTH_GITHUB_CLIENT_ID: z.string().optional(),
  AUTH_GITHUB_CLIENT_SECRET: z.string().optional(),
  AUTH_GOOGLE_CLIENT_ID: z.string().optional(),
  AUTH_GOOGLE_CLIENT_SECRET: z.string().optional(),
  RESEND_API_KEY: z.string().optional(),

  // Support Module Variables
  NEXT_PUBLIC_SUPPORT_MAIL: z.string().optional(),
  NEXT_PUBLIC_CALENDLY_BOOKING_URL: z.string().optional(),

  // Storage Module Variables
  BLOB_READ_WRITE_TOKEN: z.string().optional(),
  DATABASE_URL: z.string().optional(),

  // Observability Module Variables
  BETTERSTACK_TELEMETRY_SOURCE_TOKEN: z.string().optional(),
  BETTERSTACK_TELEMETRY_INGESTING_HOST: z.string().optional(),
  NEXT_PUBLIC_GOOGLE_ANALYTICS_MEASUREMENT_ID: z.string().optional(),

  // Payment Module Variables
  DODO_PAYMENTS_API_KEY: z.string().optional(),
  DODO_PAYMENTS_WEBHOOK_KEY: z.string().optional(),
  DODO_PAYMENTS_RETURN_URL: z.string().optional(),
  DODO_PAYMENTS_ENVIRONMENT: z.string().optional(),
  DODO_CREDITS_PRODUCT_ID: z.string().optional(),
  NEXT_PUBLIC_DODO_PAYMENTS_URL: z.string().optional(),
});

export type FormValues = z.infer<typeof formSchema>;