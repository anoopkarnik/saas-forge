import type { ScaffoldModuleId } from "./constants/scaffold-modules";
import type { FormValues } from "./zod/download";

export type WizardStepId =
  | "start"
  | "basics"
  | "features"
  | "accounts"
  | "review";

export type WizardFieldName = keyof FormValues;

export type WizardStep = {
  id: WizardStepId;
  title: string;
  description: string;
};

export type WizardFieldMeta = {
  label: string;
  helper?: string;
  reviewLabel?: string;
};

export type ProviderGroup = {
  id: string;
  title: string;
  description: string;
  fields: WizardFieldName[];
};

export const WIZARD_STEPS: WizardStep[] = [
  {
    id: "start",
    title: "Start",
    description: "Choose the easiest way to begin.",
  },
  {
    id: "basics",
    title: "Basics",
    description: "Set your app name, theme, and platforms.",
  },
  {
    id: "features",
    title: "Features",
    description: "Pick the capabilities you want to ship with.",
  },
  {
    id: "accounts",
    title: "Accounts & Keys",
    description: "Connect only the services your choices require.",
  },
  {
    id: "review",
    title: "Review",
    description: "Check your setup and download the scaffold.",
  },
];

export const WIZARD_FIELD_META: Partial<Record<WizardFieldName, WizardFieldMeta>> = {
  name: {
    label: "Project Folder Name",
    helper: "Used as the downloaded folder name on disk.",
    reviewLabel: "Project folder",
  },
  NEXT_PUBLIC_SAAS_NAME: {
    label: "Product Name",
    helper: "Shown across your app, landing page, and emails.",
    reviewLabel: "Product name",
  },
  NEXT_PUBLIC_COMPANY_NAME: {
    label: "Company or Team Name",
    helper: "Used in legal pages, billing, and support copy.",
    reviewLabel: "Company name",
  },
  NEXT_PUBLIC_URL: {
    label: "Primary App URL",
    helper: "Your production site URL, like https://myapp.com and if local development URL like http://localhost:3000.",
    reviewLabel: "Primary URL",
  },
  NEXT_PUBLIC_THEME: {
    label: "Brand Color",
    helper: "Sets the visual accent across the starter.",
    reviewLabel: "Theme color",
  },
  NEXT_PUBLIC_THEME_TYPE: {
    label: "Default Color Mode",
    helper: "Choose light, dark, or follow the user's device.",
    reviewLabel: "Default mode",
  },
  NEXT_PUBLIC_PLATFORM: {
    label: "Apps to Include",
    helper: "Web is always included because it powers the backend.",
    reviewLabel: "Platforms",
  },
  NEXT_PUBLIC_CMS: {
    label: "Marketing Content Source",
    helper: "Decides how your landing page and docs content are managed.",
    reviewLabel: "Content source",
  },
  NEXT_PUBLIC_AUTH_PROVIDERS: {
    label: "Sign-In Methods",
    helper: "Choose how users create accounts and log in.",
    reviewLabel: "Sign-in methods",
  },
  NEXT_PUBLIC_SUPPORT_FEATURES: {
    label: "Support Touchpoints",
    helper: "Add email support or meeting booking if you want them on day one.",
    reviewLabel: "Support features",
  },
  NEXT_PUBLIC_IMAGE_STORAGE: {
    label: "File & Image Storage",
    helper: "Choose where uploaded assets will live.",
    reviewLabel: "Asset storage",
  },
  NEXT_PUBLIC_OBSERVABILITY_FEATURES: {
    label: "Monitoring & Protection",
    helper: "Enable logging, analytics, and rate limiting only if you need them.",
    reviewLabel: "Observability",
  },
  BETTER_AUTH_SECRET: {
    label: "Sign-In Secret",
    helper: "Keeps authentication sessions secure.",
    reviewLabel: "Sign-in secret",
  },
  NEXT_PUBLIC_EMAIL_CLIENT: {
    label: "Email Delivery Service",
    helper: "Needed when you send verification or support emails.",
    reviewLabel: "Email provider",
  },
  RESEND_API_KEY: {
    label: "Resend API Key",
    helper: "Lets the starter send product emails through Resend.",
    reviewLabel: "Resend connected",
  },
  AUTH_GITHUB_CLIENT_ID: {
    label: "GitHub App Client ID",
    helper: "Used for GitHub sign-in.",
    reviewLabel: "GitHub sign-in",
  },
  AUTH_GITHUB_CLIENT_SECRET: {
    label: "GitHub App Client Secret",
    helper: "Used for GitHub sign-in.",
  },
  AUTH_GOOGLE_CLIENT_ID: {
    label: "Google Client ID",
    helper: "Used for Google sign-in.",
    reviewLabel: "Google sign-in",
  },
  AUTH_GOOGLE_CLIENT_SECRET: {
    label: "Google Client Secret",
    helper: "Used for Google sign-in.",
  },
  AUTH_LINKEDIN_CLIENT_ID: {
    label: "LinkedIn Client ID",
    helper: "Used for LinkedIn sign-in.",
    reviewLabel: "LinkedIn sign-in",
  },
  AUTH_LINKEDIN_CLIENT_SECRET: {
    label: "LinkedIn Client Secret",
    helper: "Used for LinkedIn sign-in.",
  },
  DATABASE_URL: {
    label: "Postgres Database URL",
    helper: "The main database connection string for your app.",
    reviewLabel: "Database",
  },
  LANDING_DATABASE_ID: {
    label: "Landing Page Database ID",
    helper: "Used when your marketing site content comes from Notion.",
  },
  HERO_DATABASE_ID: {
    label: "Hero Section Database ID",
    helper: "Used when your marketing site content comes from Notion.",
  },
  FEATURE_DATABASE_ID: {
    label: "Features Database ID",
    helper: "Used when your marketing site content comes from Notion.",
  },
  TESTIMONIAL_DATABASE_ID: {
    label: "Testimonials Database ID",
    helper: "Used when your marketing site content comes from Notion.",
  },
  PRICING_DATABASE_ID: {
    label: "Pricing Database ID",
    helper: "Used when your marketing site content comes from Notion.",
  },
  FAQ_DATABASE_ID: {
    label: "FAQ Database ID",
    helper: "Used when your marketing site content comes from Notion.",
  },
  FOOTER_DATABASE_ID: {
    label: "Footer Database ID",
    helper: "Used when your marketing site content comes from Notion.",
  },
  DOCUMENTATION_DATABASE_ID: {
    label: "Documentation Database ID",
    helper: "Used when your docs content comes from Notion.",
  },
  NOTION_API_TOKEN: {
    label: "Notion Integration Token",
    helper: "Lets the starter read your Notion content.",
    reviewLabel: "Notion connected",
  },
  UPSTASH_REDIS_REST_URL: {
    label: "Upstash REST URL",
    helper: "Shared by caching and rate-limiting features.",
    reviewLabel: "Upstash connected",
  },
  UPSTASH_REDIS_REST_TOKEN: {
    label: "Upstash REST Token",
    helper: "Shared by caching and rate-limiting features.",
  },
  BLOB_READ_WRITE_TOKEN: {
    label: "Vercel Blob Token",
    helper: "Lets the starter upload assets to Vercel Blob.",
    reviewLabel: "Vercel Blob connected",
  },
  R2_ACCOUNT_ID: {
    label: "Cloudflare R2 Account ID",
    helper: "Used when storing assets in Cloudflare R2.",
    reviewLabel: "Cloudflare R2 connected",
  },
  R2_ACCESS_KEY_ID: {
    label: "Cloudflare R2 Access Key ID",
    helper: "Used when storing assets in Cloudflare R2.",
  },
  R2_SECRET_ACCESS_KEY: {
    label: "Cloudflare R2 Secret Access Key",
    helper: "Used when storing assets in Cloudflare R2.",
  },
  R2_BUCKET_NAME: {
    label: "Cloudflare R2 Bucket Name",
    helper: "Used when storing assets in Cloudflare R2.",
  },
  NEXT_PUBLIC_R2_PUBLIC_URL: {
    label: "Cloudflare R2 Public URL",
    helper: "Public URL for uploaded assets in R2.",
  },
  NEXT_PUBLIC_GOOGLE_ANALYTICS_MEASUREMENT_ID: {
    label: "Google Analytics Measurement ID",
    helper: "Adds Google Analytics tracking to the starter.",
    reviewLabel: "Google Analytics",
  },
  BETTERSTACK_TELEMETRY_SOURCE_TOKEN: {
    label: "Better Stack Source Token",
    helper: "Adds hosted logging to the starter.",
    reviewLabel: "Better Stack logging",
  },
  BETTERSTACK_TELEMETRY_INGESTING_HOST: {
    label: "Better Stack Ingesting Host",
    helper: "Adds hosted logging to the starter.",
  },
  NEXT_PUBLIC_ALLOW_RATE_LIMIT: {
    label: "Rate-Limit Provider",
    helper: "Choose the service that will enforce request throttling.",
    reviewLabel: "Rate limiting",
  },
  NEXT_PUBLIC_PAYMENT_GATEWAY: {
    label: "Payment Provider",
    helper: "Choose how the starter should accept payments.",
    reviewLabel: "Payment provider",
  },
  DODO_PAYMENTS_API_KEY: {
    label: "Dodo API Key",
    helper: "Used to create checkout sessions and manage billing.",
    reviewLabel: "Dodo connected",
  },
  DODO_PAYMENTS_WEBHOOK_KEY: {
    label: "Dodo Webhook Key",
    helper: "Lets the starter verify Dodo payment events.",
  },
  DODO_PAYMENTS_RETURN_URL: {
    label: "Dodo Return URL",
    helper: "Where customers return after checkout.",
  },
  DODO_PAYMENTS_ENVIRONMENT: {
    label: "Dodo Environment",
    helper: "Pick test while setting up, then switch to live when ready.",
    reviewLabel: "Dodo mode",
  },
  DODO_CREDITS_PRODUCT_ID: {
    label: "Dodo Credits Product ID",
    helper: "Maps Dodo checkout to your credits purchase.",
  },
  NEXT_PUBLIC_DODO_PAYMENTS_URL: {
    label: "Dodo Public URL",
    helper: "Public base URL for Dodo flows.",
  },
  STRIPE_SECRET_KEY: {
    label: "Stripe Secret Key",
    helper: "Used to create Stripe checkout sessions.",
    reviewLabel: "Stripe connected",
  },
  STRIPE_WEBHOOK_SECRET: {
    label: "Stripe Webhook Secret",
    helper: "Lets the starter verify Stripe webhook events.",
  },
};

const BILLING_MODULE_ID: ScaffoldModuleId = "billing";

const hasModule = (values: FormValues, moduleId: ScaffoldModuleId) =>
  Array.isArray(values.SELECTED_MODULES) &&
  values.SELECTED_MODULES.includes(moduleId);

const needsEmailProvider = (values: FormValues) =>
  (values.NEXT_PUBLIC_AUTH_PROVIDERS || []).includes("email_verification") ||
  (values.NEXT_PUBLIC_SUPPORT_FEATURES || []).includes("support_mail");

const usesNotion = (values: FormValues) => values.NEXT_PUBLIC_CMS === "notion";
const usesPostgresCms = (values: FormValues) => values.NEXT_PUBLIC_CMS === "postgres";
const usesUpstashForRateLimit = (values: FormValues) =>
  (values.NEXT_PUBLIC_OBSERVABILITY_FEATURES || []).includes("rate_limiting");
const usesResend = (values: FormValues) =>
  needsEmailProvider(values) && values.NEXT_PUBLIC_EMAIL_CLIENT === "resend";
const usesR2 = (values: FormValues) => values.NEXT_PUBLIC_IMAGE_STORAGE === "cloudflare_r2";
const usesBlob = (values: FormValues) => values.NEXT_PUBLIC_IMAGE_STORAGE === "vercel_blob";
const usesBilling = (values: FormValues) => hasModule(values, BILLING_MODULE_ID);
const usesLogging = (values: FormValues) =>
  (values.NEXT_PUBLIC_OBSERVABILITY_FEATURES || []).includes("logging");
const usesGoogleAnalytics = (values: FormValues) =>
  (values.NEXT_PUBLIC_OBSERVABILITY_FEATURES || []).includes("google_analytics");

const dedupeFields = (fields: WizardFieldName[]) =>
  Array.from(new Set(fields));

export function getWizardFieldMeta(name: WizardFieldName) {
  return WIZARD_FIELD_META[name];
}

export function getWizardStepFields(
  stepId: WizardStepId,
  values: FormValues,
): WizardFieldName[] {
  switch (stepId) {
    case "basics":
      return [
        "name",
        "NEXT_PUBLIC_SAAS_NAME",
        "NEXT_PUBLIC_COMPANY_NAME",
        "NEXT_PUBLIC_URL",
        "NEXT_PUBLIC_THEME",
        "NEXT_PUBLIC_THEME_TYPE",
        "NEXT_PUBLIC_PLATFORM",
      ];
    case "features":
      return [
        "NEXT_PUBLIC_CMS",
        "NEXT_PUBLIC_AUTH_PROVIDERS",
        "NEXT_PUBLIC_SUPPORT_FEATURES",
        "NEXT_PUBLIC_IMAGE_STORAGE",
        "NEXT_PUBLIC_OBSERVABILITY_FEATURES",
        "SELECTED_MODULES",
      ];
    case "accounts":
      return getAccountsProviderGroups(values).flatMap((group) => group.fields);
    default:
      return [];
  }
}

export function getAccountsProviderGroups(values: FormValues): ProviderGroup[] {
  const groups: ProviderGroup[] = [
    {
      id: "database",
      title: "Postgres Database",
      description: "Every scaffold needs one database connection to boot the app.",
      fields: ["DATABASE_URL"],
    },
    {
      id: "notion",
      title: "Notion",
      description:
        "Needed only if you want marketing content and docs to come from Notion.",
      fields: usesNotion(values)
        ? [
            "LANDING_DATABASE_ID",
            "HERO_DATABASE_ID",
            "FEATURE_DATABASE_ID",
            "TESTIMONIAL_DATABASE_ID",
            "PRICING_DATABASE_ID",
            "FAQ_DATABASE_ID",
            "FOOTER_DATABASE_ID",
            "DOCUMENTATION_DATABASE_ID",
            "NOTION_API_TOKEN",
          ]
        : [],
    },
    {
      id: "upstash",
      title: "Upstash",
      description:
        "Needed when you use Notion or Postgres CMS caching, or when you enable rate limiting.",
      fields:
        usesNotion(values) ||
        usesPostgresCms(values) ||
        (usesUpstashForRateLimit(values) &&
          values.NEXT_PUBLIC_ALLOW_RATE_LIMIT === "upstash")
          ? ["UPSTASH_REDIS_REST_URL", "UPSTASH_REDIS_REST_TOKEN"]
          : [],
    },
    {
      id: "auth",
      title: "Better Auth & OAuth",
      description:
        "Secure sign-in needs one app secret, plus credentials for each social provider you enable.",
      fields: dedupeFields([
        "BETTER_AUTH_SECRET",
        ...(needsEmailProvider(values) ? (["NEXT_PUBLIC_EMAIL_CLIENT"] as WizardFieldName[]) : []),
        ...((values.NEXT_PUBLIC_AUTH_PROVIDERS || []).includes("github")
          ? (["AUTH_GITHUB_CLIENT_ID", "AUTH_GITHUB_CLIENT_SECRET"] as WizardFieldName[])
          : []),
        ...((values.NEXT_PUBLIC_AUTH_PROVIDERS || []).includes("google")
          ? (["AUTH_GOOGLE_CLIENT_ID", "AUTH_GOOGLE_CLIENT_SECRET"] as WizardFieldName[])
          : []),
        ...((values.NEXT_PUBLIC_AUTH_PROVIDERS || []).includes("linkedin")
          ? (["AUTH_LINKEDIN_CLIENT_ID", "AUTH_LINKEDIN_CLIENT_SECRET"] as WizardFieldName[])
          : []),
      ]),
    },
    {
      id: "resend",
      title: "Resend",
      description:
        "Only needed if you want to send sign-in or support emails through Resend.",
      fields: usesResend(values) ? ["RESEND_API_KEY"] : [],
    },
    {
      id: "storage",
      title: usesR2(values) ? "Cloudflare R2" : "Vercel Blob",
      description:
        "Only the storage provider you chose for uploads is shown here.",
      fields: usesR2(values)
        ? [
            "R2_ACCOUNT_ID",
            "R2_ACCESS_KEY_ID",
            "R2_SECRET_ACCESS_KEY",
            "R2_BUCKET_NAME",
            "NEXT_PUBLIC_R2_PUBLIC_URL",
          ]
        : usesBlob(values)
          ? ["BLOB_READ_WRITE_TOKEN"]
          : [],
    },
    {
      id: "analytics",
      title: "Analytics & Reliability",
      description:
        "These are only needed for the monitoring and protection features you turned on.",
      fields: dedupeFields([
        ...(usesLogging(values)
          ? ([
              "BETTERSTACK_TELEMETRY_SOURCE_TOKEN",
              "BETTERSTACK_TELEMETRY_INGESTING_HOST",
            ] as WizardFieldName[])
          : []),
        ...(usesGoogleAnalytics(values)
          ? (["NEXT_PUBLIC_GOOGLE_ANALYTICS_MEASUREMENT_ID"] as WizardFieldName[])
          : []),
        ...(usesUpstashForRateLimit(values)
          ? (["NEXT_PUBLIC_ALLOW_RATE_LIMIT"] as WizardFieldName[])
          : []),
      ]),
    },
    {
      id: "payments",
      title: "Stripe or Dodo",
      description:
        "Only needed if you want the scaffold to ship with built-in billing and checkout.",
      fields: dedupeFields([
        ...(usesBilling(values)
          ? (["NEXT_PUBLIC_PAYMENT_GATEWAY"] as WizardFieldName[])
          : []),
        ...(values.NEXT_PUBLIC_PAYMENT_GATEWAY === "stripe"
          ? (["STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET"] as WizardFieldName[])
          : []),
        ...(values.NEXT_PUBLIC_PAYMENT_GATEWAY === "dodo"
          ? ([
              "DODO_PAYMENTS_API_KEY",
              "DODO_PAYMENTS_WEBHOOK_KEY",
              "DODO_PAYMENTS_RETURN_URL",
              "DODO_PAYMENTS_ENVIRONMENT",
              "DODO_CREDITS_PRODUCT_ID",
              "NEXT_PUBLIC_DODO_PAYMENTS_URL",
            ] as WizardFieldName[])
          : []),
      ]),
    },
  ];

  return groups.filter((group) => group.fields.length > 0);
}

export function getReviewSummaryItems(values: FormValues) {
  return [
    {
      label: "Content",
      value:
        values.NEXT_PUBLIC_CMS === "constant"
          ? "Static content in the repo"
          : values.NEXT_PUBLIC_CMS === "postgres"
            ? "Postgres-backed CMS"
            : values.NEXT_PUBLIC_CMS === "notion"
              ? "Notion-backed CMS"
              : "Custom CMS",
    },
    {
      label: "Sign-In",
      value:
        values.NEXT_PUBLIC_AUTH_PROVIDERS?.length
          ? values.NEXT_PUBLIC_AUTH_PROVIDERS.join(", ")
          : "No providers chosen",
    },
    {
      label: "Support",
      value:
        values.NEXT_PUBLIC_SUPPORT_FEATURES?.length
          ? values.NEXT_PUBLIC_SUPPORT_FEATURES.join(", ")
          : "No support extras",
    },
    {
      label: "Storage",
      value: values.NEXT_PUBLIC_IMAGE_STORAGE || "Not chosen",
    },
    {
      label: "Monitoring",
      value:
        values.NEXT_PUBLIC_OBSERVABILITY_FEATURES?.length
          ? values.NEXT_PUBLIC_OBSERVABILITY_FEATURES.join(", ")
          : "No extras enabled",
    },
    {
      label: "Payments",
      value: usesBilling(values)
        ? values.NEXT_PUBLIC_PAYMENT_GATEWAY === "none"
          ? "Billing module enabled, provider not chosen yet"
          : values.NEXT_PUBLIC_PAYMENT_GATEWAY
        : "Not included",
    },
  ];
}

export function isWizardFieldRequired(
  name: WizardFieldName,
  values: FormValues,
) {
  switch (name) {
    case "name":
    case "NEXT_PUBLIC_SAAS_NAME":
    case "NEXT_PUBLIC_COMPANY_NAME":
    case "NEXT_PUBLIC_URL":
    case "NEXT_PUBLIC_THEME":
    case "NEXT_PUBLIC_THEME_TYPE":
    case "NEXT_PUBLIC_PLATFORM":
    case "NEXT_PUBLIC_CMS":
    case "NEXT_PUBLIC_AUTH_PROVIDERS":
    case "NEXT_PUBLIC_IMAGE_STORAGE":
    case "DATABASE_URL":
    case "BETTER_AUTH_SECRET":
      return true;
    case "NEXT_PUBLIC_EMAIL_CLIENT":
      return needsEmailProvider(values);
    case "RESEND_API_KEY":
      return usesResend(values);
    case "AUTH_GITHUB_CLIENT_ID":
    case "AUTH_GITHUB_CLIENT_SECRET":
      return (values.NEXT_PUBLIC_AUTH_PROVIDERS || []).includes("github");
    case "AUTH_GOOGLE_CLIENT_ID":
    case "AUTH_GOOGLE_CLIENT_SECRET":
      return (values.NEXT_PUBLIC_AUTH_PROVIDERS || []).includes("google");
    case "AUTH_LINKEDIN_CLIENT_ID":
    case "AUTH_LINKEDIN_CLIENT_SECRET":
      return (values.NEXT_PUBLIC_AUTH_PROVIDERS || []).includes("linkedin");
    case "LANDING_DATABASE_ID":
    case "HERO_DATABASE_ID":
    case "FEATURE_DATABASE_ID":
    case "TESTIMONIAL_DATABASE_ID":
    case "PRICING_DATABASE_ID":
    case "FAQ_DATABASE_ID":
    case "FOOTER_DATABASE_ID":
    case "DOCUMENTATION_DATABASE_ID":
    case "NOTION_API_TOKEN":
      return usesNotion(values);
    case "UPSTASH_REDIS_REST_URL":
    case "UPSTASH_REDIS_REST_TOKEN":
      return (
        usesNotion(values) ||
        usesPostgresCms(values) ||
        (usesUpstashForRateLimit(values) &&
          values.NEXT_PUBLIC_ALLOW_RATE_LIMIT === "upstash")
      );
    case "BLOB_READ_WRITE_TOKEN":
      return usesBlob(values);
    case "R2_ACCOUNT_ID":
    case "R2_ACCESS_KEY_ID":
    case "R2_SECRET_ACCESS_KEY":
    case "R2_BUCKET_NAME":
    case "NEXT_PUBLIC_R2_PUBLIC_URL":
      return usesR2(values);
    case "NEXT_PUBLIC_ALLOW_RATE_LIMIT":
      return usesUpstashForRateLimit(values);
    case "NEXT_PUBLIC_PAYMENT_GATEWAY":
      return usesBilling(values);
    case "STRIPE_SECRET_KEY":
    case "STRIPE_WEBHOOK_SECRET":
      return values.NEXT_PUBLIC_PAYMENT_GATEWAY === "stripe";
    case "DODO_PAYMENTS_API_KEY":
    case "DODO_PAYMENTS_WEBHOOK_KEY":
    case "DODO_PAYMENTS_RETURN_URL":
    case "DODO_PAYMENTS_ENVIRONMENT":
    case "DODO_CREDITS_PRODUCT_ID":
    case "NEXT_PUBLIC_DODO_PAYMENTS_URL":
      return values.NEXT_PUBLIC_PAYMENT_GATEWAY === "dodo";
    default:
      return false;
  }
}

export function isWizardFieldComplete(
  name: WizardFieldName,
  values: FormValues,
) {
  const value = values[name];

  if (Array.isArray(value)) {
    return value.length > 0;
  }

  if (typeof value === "string") {
    return value.trim().length > 0;
  }

  return Boolean(value);
}
