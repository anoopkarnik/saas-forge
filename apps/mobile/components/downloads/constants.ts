export type FormState = {
    name: string;
    SELECTED_MODULES: string[];
    // Project
    NEXT_PUBLIC_THEME: string;
    NEXT_PUBLIC_THEME_TYPE: string;
    NEXT_PUBLIC_PLATFORM: string[];
    NEXT_PUBLIC_SAAS_NAME: string;
    NEXT_PUBLIC_COMPANY_NAME: string;
    NEXT_PUBLIC_URL: string;
    // Landing / CMS
    NEXT_PUBLIC_CMS: string;
    LANDING_DATABASE_ID: string;
    HERO_DATABASE_ID: string;
    FEATURE_DATABASE_ID: string;
    TESTIMONIAL_DATABASE_ID: string;
    PRICING_DATABASE_ID: string;
    FAQ_DATABASE_ID: string;
    FOOTER_DATABASE_ID: string;
    DOCUMENTATION_DATABASE_ID: string;
    NOTION_API_TOKEN: string;
    UPSTASH_REDIS_REST_URL: string;
    UPSTASH_REDIS_REST_TOKEN: string;
    // Auth
    NEXT_PUBLIC_AUTH_FRAMEWORK: string;
    BETTER_AUTH_SECRET: string;
    NEXT_PUBLIC_AUTH_PROVIDERS: string[];
    NEXT_PUBLIC_EMAIL_CLIENT: string;
    RESEND_API_KEY: string;
    AUTH_LINKEDIN_CLIENT_ID: string;
    AUTH_LINKEDIN_CLIENT_SECRET: string;
    AUTH_GITHUB_CLIENT_ID: string;
    AUTH_GITHUB_CLIENT_SECRET: string;
    AUTH_GOOGLE_CLIENT_ID: string;
    AUTH_GOOGLE_CLIENT_SECRET: string;
    // Support
    NEXT_PUBLIC_SUPPORT_FEATURES: string[];
    NEXT_PUBLIC_SUPPORT_MAIL: string;
    NEXT_PUBLIC_CALENDLY_BOOKING_URL: string;
    // Storage
    NEXT_PUBLIC_IMAGE_STORAGE: string;
    BLOB_READ_WRITE_TOKEN: string;
    R2_ACCOUNT_ID: string;
    R2_ACCESS_KEY_ID: string;
    R2_SECRET_ACCESS_KEY: string;
    R2_BUCKET_NAME: string;
    NEXT_PUBLIC_R2_PUBLIC_URL: string;
    DATABASE_URL: string;
    // Observability
    NEXT_PUBLIC_OBSERVABILITY_FEATURES: string[];
    BETTERSTACK_TELEMETRY_SOURCE_TOKEN: string;
    BETTERSTACK_TELEMETRY_INGESTING_HOST: string;
    NEXT_PUBLIC_GOOGLE_ANALYTICS_MEASUREMENT_ID: string;
    NEXT_PUBLIC_ALLOW_RATE_LIMIT: string;
    // Payment
    NEXT_PUBLIC_PAYMENT_GATEWAY: string;
    DODO_PAYMENTS_API_KEY: string;
    DODO_PAYMENTS_WEBHOOK_KEY: string;
    DODO_PAYMENTS_RETURN_URL: string;
    DODO_PAYMENTS_ENVIRONMENT: string;
    DODO_CREDITS_PRODUCT_ID: string;
    NEXT_PUBLIC_DODO_PAYMENTS_URL: string;
    STRIPE_SECRET_KEY: string;
    STRIPE_WEBHOOK_SECRET: string;
};

export const DEFAULT_FORM: FormState = {
    name: "",
    SELECTED_MODULES: [],
    NEXT_PUBLIC_THEME: "neutral",
    NEXT_PUBLIC_THEME_TYPE: "system",
    NEXT_PUBLIC_PLATFORM: ["web"],
    NEXT_PUBLIC_SAAS_NAME: "",
    NEXT_PUBLIC_COMPANY_NAME: "",
    NEXT_PUBLIC_URL: "",
    NEXT_PUBLIC_CMS: "notion",
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
    NEXT_PUBLIC_AUTH_PROVIDERS: [],
    NEXT_PUBLIC_EMAIL_CLIENT: "none",
    RESEND_API_KEY: "",
    AUTH_LINKEDIN_CLIENT_ID: "",
    AUTH_LINKEDIN_CLIENT_SECRET: "",
    AUTH_GITHUB_CLIENT_ID: "",
    AUTH_GITHUB_CLIENT_SECRET: "",
    AUTH_GOOGLE_CLIENT_ID: "",
    AUTH_GOOGLE_CLIENT_SECRET: "",
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
    NEXT_PUBLIC_ALLOW_RATE_LIMIT: "upstash",
    NEXT_PUBLIC_PAYMENT_GATEWAY: "none",
    DODO_PAYMENTS_API_KEY: "",
    DODO_PAYMENTS_WEBHOOK_KEY: "",
    DODO_PAYMENTS_RETURN_URL: "",
    DODO_PAYMENTS_ENVIRONMENT: "",
    DODO_CREDITS_PRODUCT_ID: "",
    NEXT_PUBLIC_DODO_PAYMENTS_URL: "",
    STRIPE_SECRET_KEY: "",
    STRIPE_WEBHOOK_SECRET: "",
};

export const STRING_FIELD_KEYS = Object.keys(DEFAULT_FORM).filter(
    (k) =>
        k !== "name" &&
        !Array.isArray(DEFAULT_FORM[k as keyof FormState])
) as (keyof FormState)[];

export const THEME_OPTIONS = [
    { value: "blue", label: "Blue", color: "#3b82f6" },
    { value: "green", label: "Green", color: "#22c55e" },
    { value: "neutral", label: "Neutral", color: "#737373" },
    { value: "orange", label: "Orange", color: "#f97316" },
    { value: "red", label: "Red", color: "#ef4444" },
    { value: "rose", label: "Rose", color: "#f43f5e" },
    { value: "violet", label: "Violet", color: "#8b5cf6" },
    { value: "yellow", label: "Yellow", color: "#eab308" },
];

export const THEME_TYPE_OPTIONS = [
    { value: "light", label: "Light" },
    { value: "dark", label: "Dark" },
    { value: "system", label: "System" },
];

export const PLATFORM_OPTIONS = [
    { value: "web", label: "Web App (Compulsory)", disabled: true },
    { value: "mobile", label: "Mobile App", disabled: false },
    { value: "desktop", label: "Desktop App", disabled: false },
];

export const CMS_OPTIONS = [
    { value: "constant", label: "Constant" },
    { value: "postgres", label: "Postgres" },
    { value: "notion", label: "Notion" },
    { value: "strapi", label: "Strapi (Coming Soon)", disabled: true },
];

export const AUTH_FRAMEWORK_OPTIONS = [
    { value: "better-auth", label: "Better Auth" },
];

export const AUTH_PROVIDER_OPTIONS = [
    { value: "email_verification", label: "Email Verification" },
    { value: "linkedin", label: "LinkedIn" },
    { value: "google", label: "Google" },
    { value: "github", label: "GitHub" },
];

export const EMAIL_CLIENT_OPTIONS = [
    { value: "none", label: "None" },
    { value: "resend", label: "Resend (Free: 100 emails/day)" },
    { value: "gmail_smtp", label: "Gmail SMTP (Coming Soon)", disabled: true },
];

export const SUPPORT_FEATURE_OPTIONS = [
    { value: "support_mail", label: "Send Support Mail" },
    { value: "calendly", label: "Book Meeting" },
];

export const IMAGE_STORAGE_OPTIONS = [
    { value: "vercel_blob", label: "Vercel Blob (Free 1GB)" },
    { value: "cloudflare_r2", label: "Cloudflare R2 (Free 100GB)" },
];

export const OBSERVABILITY_FEATURE_OPTIONS = [
    { value: "logging", label: "Logging" },
    { value: "google_analytics", label: "Google Analytics" },
    { value: "rate_limiting", label: "Rate Limiting" },
];

export const RATE_LIMIT_OPTIONS = [
    { value: "upstash", label: "Upstash" },
];

export const PAYMENT_GATEWAY_OPTIONS = [
    { value: "none", label: "None" },
    { value: "dodo", label: "Dodo Payments" },
    { value: "stripe", label: "Stripe" },
];

export const PAYMENT_ENV_KEYS: (keyof FormState)[] = [
    "NEXT_PUBLIC_PAYMENT_GATEWAY",
    "DODO_PAYMENTS_API_KEY",
    "DODO_PAYMENTS_WEBHOOK_KEY",
    "DODO_PAYMENTS_RETURN_URL",
    "DODO_PAYMENTS_ENVIRONMENT",
    "DODO_CREDITS_PRODUCT_ID",
    "NEXT_PUBLIC_DODO_PAYMENTS_URL",
    "STRIPE_SECRET_KEY",
    "STRIPE_WEBHOOK_SECRET",
];

export const DODO_ENV_OPTIONS = [
    { value: "test_mode", label: "Test Mode" },
    { value: "live_mode", label: "Live Mode" },
];

export const BASE_SCAFFOLD_CREDITS_COST = 10;

export const SCAFFOLD_MODULE_OPTIONS = [
    {
        value: "billing",
        label: "Billing & Payments",
        description: "Checkout, credits purchase UI, transaction history, and payment webhooks.",
        creditsCost: 10,
        disabled: false,
    },
    {
        value: "multi_tenancy",
        label: "Organizations / Teams",
        description: "Coming soon",
        creditsCost: 15,
        disabled: true,
    },
    {
        value: "ai",
        label: "AI",
        description: "Coming soon",
        creditsCost: 15,
        disabled: true,
    },
    {
        value: "api_keys",
        label: "API Keys",
        description: "Coming soon",
        creditsCost: 5,
        disabled: true,
    },
    {
        value: "notifications",
        label: "Notifications",
        description: "Coming soon",
        creditsCost: 5,
        disabled: true,
    },
];
