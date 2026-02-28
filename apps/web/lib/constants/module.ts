import {
  Package,
  Lock,
  CreditCard,
  Database,
  LayoutTemplate,
  Activity,
  LifeBuoy,
  LucideIcon,
  Shield,
  Calendar,
  BarChart3,
  CircleDot
} from "lucide-react";
import React from "react";
import { SiVercel, SiResend, SiNotion, SiUpstash } from "react-icons/si";
import { FaStripe } from "react-icons/fa";

export interface ModuleField {
  name: string;
  description: string;
  showIf?: {
    field: string;
    value: string;
  };
  showIfIncludes?: {
    field: string;
    value: string;
  };
  required?: boolean;
  multiselect?: boolean;
  providerHints?: {
    name: string;
    url: string;
    color: string;
    icon: React.ComponentType<any>;
    tier: string;
    info: string;
  }[];
}

export interface ModuleSection {
  id: string;
  title: string;
  icon: LucideIcon;
  color: string;
  borderColor: string;
  description: string;
  documentation?: { label: string; slug: string }[];
  fields: readonly ModuleField[];
}

export const MODULE_CONFIG: ModuleSection[] = [
  {
    id: "project",
    title: "Project Settings",
    icon: Package,
    color: "text-blue-500",
    borderColor: "border-l-blue-500",
    description: "Core settings for your application identity.",
    documentation: [{ label: "Overview", slug: "overview" }],
    fields: [
      { name: "NEXT_PUBLIC_THEME", description: "The primary color theme for your application.", required: true },
      { name: "NEXT_PUBLIC_THEME_TYPE", description: "The default theme mode (light, dark, or system).", required: true },
      { name: "NEXT_PUBLIC_PLATFORM", description: "Select the platform you want to build for.", required: true, multiselect: true },
      { name: "NEXT_PUBLIC_SAAS_NAME", description: "The name of your SaaS application.", required: true },
      { name: "NEXT_PUBLIC_COMPANY_NAME", description: "The name of your company.", required: true },
      { name: "NEXT_PUBLIC_URL", description: "The URL of your application.", required: true },
    ],
  },
  {
    id: "landing",
    title: "Landing Module",
    icon: LayoutTemplate,
    color: "text-purple-500",
    borderColor: "border-l-purple-500",
    description: "Notion-backed CMS content.",
    documentation: [{ label: "Notion Setup", slug: "notion-setup" }],
    fields: [
      { name: "NEXT_PUBLIC_CMS", description: "The CMS you want to use for your landing page.", required: true },
      { name: "LANDING_DATABASE_ID", description: "Notion database ID for landing page content.", showIf: { field: "NEXT_PUBLIC_CMS", value: "notion" }, required: true },
      { name: "HERO_DATABASE_ID", description: "Notion database ID for hero section content.", showIf: { field: "NEXT_PUBLIC_CMS", value: "notion" }, required: true },
      { name: "FEATURE_DATABASE_ID", description: "Notion database ID for features section content.", showIf: { field: "NEXT_PUBLIC_CMS", value: "notion" }, required: true },
      { name: "TESTIMONIAL_DATABASE_ID", description: "Notion database ID for testimonials content.", showIf: { field: "NEXT_PUBLIC_CMS", value: "notion" }, required: true },
      { name: "PRICING_DATABASE_ID", description: "Notion database ID for pricing section content.", showIf: { field: "NEXT_PUBLIC_CMS", value: "notion" }, required: true },
      { name: "FAQ_DATABASE_ID", description: "Notion database ID for FAQ section content.", showIf: { field: "NEXT_PUBLIC_CMS", value: "notion" }, required: true },
      { name: "FOOTER_DATABASE_ID", description: "Notion database ID for footer content.", showIf: { field: "NEXT_PUBLIC_CMS", value: "notion" }, required: true },
      { name: "DOCUMENTATION_DATABASE_ID", description: "Notion database ID for documentation content.", showIf: { field: "NEXT_PUBLIC_CMS", value: "notion" }, required: true },
      { 
        name: "NOTION_API_TOKEN", 
        description: "Your Notion integration token.", 
        showIf: { field: "NEXT_PUBLIC_CMS", value: "notion" }, 
        required: true,
        providerHints: [
          { name: "Notion", url: "https://notion.so/my-integrations", color: "text-foreground", icon: SiNotion, tier: "Free", info: "Notion provides a free API for building integrations and CMS." },
        ]
      },
      { name: "UPSTASH_REDIS_REST_URL", description: "REST URL for Upstash Redis.", showIf: { field: "NEXT_PUBLIC_CMS", value: "notion" }, required: true },
      { 
        name: "UPSTASH_REDIS_REST_TOKEN", 
        description: "REST Token for Upstash Redis.", 
        showIf: { field: "NEXT_PUBLIC_CMS", value: "notion" }, 
        required: true,
        providerHints: [
          { name: "Upstash", url: "https://upstash.com", color: "text-[#00e9a3]", icon: SiUpstash, tier: "Free", info: "Serverless Redis with 10k requests/day free tier." },
        ]
      },
    ],
  },
  {
    id: "auth",
    title: "Authentication Module",
    icon: Lock,
    color: "text-amber-500",
    borderColor: "border-l-amber-500",
    description: "BetterAuth & OAuth providers.",
    documentation: [{ label: "Authentication Setup", slug: "authentication-overview" }],
    fields: [
      { name: "NEXT_PUBLIC_AUTH_FRAMEWORK", description: "Authentication framework to use.", required: true },
      { 
        name: "BETTER_AUTH_SECRET", 
        description: "Secret key for BetterAuth.", 
        showIf: { field: "NEXT_PUBLIC_AUTH_FRAMEWORK", value: "better-auth" }, 
        required: true,
        providerHints: [
          { name: "Better Auth", url: "https://better-auth.com", color: "text-amber-500", icon: Shield, tier: "Free", info: "Open Source Comprehensive authentication framework for TypeScript." },
        ]
      },
      { name: "NEXT_PUBLIC_AUTH_PROVIDERS", description: "Select the authentication providers to enable.", required: true },
      { name: "NEXT_PUBLIC_EMAIL_CLIENT", description: "Email client for sending emails.", showIfIncludes: { field: "NEXT_PUBLIC_AUTH_PROVIDERS", value: "email_verification" }, required: true },
      { 
        name: "RESEND_API_KEY", 
        description: "API Key for Resend email service.", 
        showIf: { field: "NEXT_PUBLIC_EMAIL_CLIENT", value: "resend" }, 
        required: true,
        providerHints: [
          { name: "Resend", url: "https://resend.com", color: "text-foreground", icon: SiResend, tier: "Free", info: "Free tier for 100 emails/day & 3000 emails/month." },
        ]
      },
      { name: "AUTH_LINKEDIN_CLIENT_ID", description: "LinkedIn OAuth Client ID.", showIfIncludes: { field: "NEXT_PUBLIC_AUTH_PROVIDERS", value: "linkedin" }, required: true },
      { name: "AUTH_LINKEDIN_CLIENT_SECRET", description: "LinkedIn OAuth Client Secret.", showIfIncludes: { field: "NEXT_PUBLIC_AUTH_PROVIDERS", value: "linkedin" }, required: true },
      { name: "AUTH_GITHUB_CLIENT_ID", description: "GitHub OAuth Client ID.", showIfIncludes: { field: "NEXT_PUBLIC_AUTH_PROVIDERS", value: "github" }, required: true },
      { name: "AUTH_GITHUB_CLIENT_SECRET", description: "GitHub OAuth Client Secret.", showIfIncludes: { field: "NEXT_PUBLIC_AUTH_PROVIDERS", value: "github" }, required: true },
      { name: "AUTH_GOOGLE_CLIENT_ID", description: "Google OAuth Client ID.", showIfIncludes: { field: "NEXT_PUBLIC_AUTH_PROVIDERS", value: "google" }, required: true },
      { name: "AUTH_GOOGLE_CLIENT_SECRET", description: "Google OAuth Client Secret.", showIfIncludes: { field: "NEXT_PUBLIC_AUTH_PROVIDERS", value: "google" }, required: true },
    ],
  },
  {
    id: "support",
    title: "Support Module",
    icon: LifeBuoy,
    color: "text-rose-500",
    borderColor: "border-l-rose-500",
    description: "Support email and booking.",
    documentation: [{ label: "Support", slug: "support" }],
    fields: [
      { name: "NEXT_PUBLIC_SUPPORT_FEATURES", description: "Select the support features to enable.", required: true },
      { name: "NEXT_PUBLIC_SUPPORT_MAIL", description: "Email address for support inquiries.", showIfIncludes: { field: "NEXT_PUBLIC_SUPPORT_FEATURES", value: "support_mail" } },
      { 
        name: "NEXT_PUBLIC_CALENDLY_BOOKING_URL", 
        description: "URL for your Calendly booking page.", 
        showIfIncludes: { field: "NEXT_PUBLIC_SUPPORT_FEATURES", value: "calendly" },
        providerHints: [
          { name: "Calendly", url: "https://calendly.com", color: "text-blue-500", icon: Calendar, tier: "Free", info: "Basic features are free forever." },
        ]
      },
      { name: "NEXT_PUBLIC_EMAIL_CLIENT", description: "Email client for sending emails.", showIfIncludes: { field: "NEXT_PUBLIC_SUPPORT_FEATURES", value: "support_mail" }, required: true },
      { 
        name: "RESEND_API_KEY", 
        description: "API Key for Resend email service.", 
        showIf: { field: "NEXT_PUBLIC_EMAIL_CLIENT", value: "resend" }, 
        required: true,
        providerHints: [
          { name: "Resend", url: "https://resend.com", color: "text-foreground", icon: SiResend, tier: "Free", info: "Free tier for 100 emails/day & 3000 emails/month." },
        ]
      },
    ],
  },
  {
    id: "storage",
    title: "Storage Module",
    icon: Database,
    color: "text-cyan-500",
    borderColor: "border-l-cyan-500",
    description: "Postgres, Redis, and Blob storage.",
    documentation: [{ label: "Postgres", slug: "postgres" },
    { label: "Storage", slug: "storage" },
    ],
    fields: [
      { name: "NEXT_PUBLIC_IMAGE_STORAGE", description: "Image storage provider.", required: true },
      { 
        name: "BLOB_READ_WRITE_TOKEN", 
        description: "Token for Vercel Blob storage.", 
        showIf: { field: "NEXT_PUBLIC_IMAGE_STORAGE", value: "vercel_blob" }, 
        required: true,
        providerHints: [
          {name: "Vercel Blob", url: "https://vercel.com/blob", color: "text-foreground", icon: SiVercel, tier: "Free for 1 GB", info: "Easy to use, free for 1 GB limit" }
        ]
      },
      { name: "R2_ACCOUNT_ID", description: "Cloudflare Account ID.", showIf: { field: "NEXT_PUBLIC_IMAGE_STORAGE", value: "cloudflare_r2" }, required: true },
      { name: "R2_ACCESS_KEY_ID", description: "Cloudflare Access Key ID.", showIf: { field: "NEXT_PUBLIC_IMAGE_STORAGE", value: "cloudflare_r2" }, required: true },
      { name: "R2_SECRET_ACCESS_KEY", description: "Cloudflare Secret Access Key.", showIf: { field: "NEXT_PUBLIC_IMAGE_STORAGE", value: "cloudflare_r2" }, required: true },
      { name: "R2_BUCKET_NAME", description: "Cloudflare R2 Bucket Name.", showIf: { field: "NEXT_PUBLIC_IMAGE_STORAGE", value: "cloudflare_r2" }, required: true },
      { 
        name: "NEXT_PUBLIC_R2_PUBLIC_URL", 
        description: "Public URL for Cloudflare R2.",
        showIf: { field: "NEXT_PUBLIC_IMAGE_STORAGE", value: "cloudflare_r2" },
        required: true,
        providerHints: [
          { name: "Cloudflare R2", url: "https://r2.cloudflare.com", color: "text-cyan-500", icon: Database, tier: "Free", info: "Cloudflare R2 is a fully-managed object storage service that provides a simple and cost-effective way to store and retrieve data." },
        ]
      },
      { 
        name: "DATABASE_URL", 
        description: "Connection string for your PostgreSQL database in the format postgresql://user:password@host:5432/dbname from any of below providers", 
        required: true,
        providerHints: [
          { name: "Neon", url: "https://neon.tech", color: "text-emerald-500", icon: Database, tier: "Free", info: "0.5 GB storage, 190 compute hours/month free. Serverless Postgres with autoscaling. Great for hobby & startup projects." },
          { name: "Supabase", url: "https://supabase.com/dashboard", color: "text-emerald-400", icon: Database, tier: "Free", info: "500 MB storage, 2 projects free. Includes Auth, Realtime & Edge Functions. Best all-in-one Postgres platform." },
          { name: "AWS RDS", url: "https://console.aws.amazon.com/rds", color: "text-orange-500", icon: Database, tier: "~$15/mo", info: "750 hrs/month free for 12 months (t3.micro). Enterprise-grade, best for production workloads at scale." },
          { name: "Railway", url: "https://railway.app", color: "text-purple-500", icon: Database, tier: "$5/mo", info: "$5 credit/month on Hobby plan. One-click Postgres with automatic backups. Easiest setup for full-stack apps." },
        ]
      },
    ],
  },
  {
    id: "observability",
    title: "Observability, Analytics & Security Module",
    icon: Activity,
    color: "text-orange-500",
    borderColor: "border-l-orange-500",
    description: "Telemetry, analytics, and security.",
    documentation: [{ label: "Observability", slug: "observability" }],
    fields: [
      { name: "NEXT_PUBLIC_OBSERVABILITY_FEATURES", description: "Select the observability features to enable.", required: true },
      { name: "BETTERSTACK_TELEMETRY_SOURCE_TOKEN", description: "Source token for BetterStack telemetry.", showIfIncludes: { field: "NEXT_PUBLIC_OBSERVABILITY_FEATURES", value: "logging" } },
      { 
        name: "BETTERSTACK_TELEMETRY_INGESTING_HOST", 
        description: "Ingesting host for BetterStack telemetry.", 
        showIfIncludes: { field: "NEXT_PUBLIC_OBSERVABILITY_FEATURES", value: "logging" },
        providerHints: [
          { name: "Better Stack", url: "https://betterstack.com", color: "text-foreground", icon: BarChart3, tier: "Free", info: "Free tier includes up to 1GB/month log management." },
        ]
      },
      { 
        name: "NEXT_PUBLIC_GOOGLE_ANALYTICS_MEASUREMENT_ID", 
        description: "Measurement ID for Google Analytics.", 
        showIfIncludes: { field: "NEXT_PUBLIC_OBSERVABILITY_FEATURES", value: "google_analytics" },
        providerHints: [
          { name: "Google Analytics", url: "https://analytics.google.com", color: "text-yellow-500", icon: BarChart3, tier: "Free", info: "Industry standard analytics, free to use." },
        ]
      },
      { name: "NEXT_PUBLIC_ALLOW_RATE_LIMIT", description: "Rate limiting provider.", showIfIncludes: { field: "NEXT_PUBLIC_OBSERVABILITY_FEATURES", value: "rate_limiting" }, required: true },
      { name: "UPSTASH_REDIS_REST_URL", description: "REST URL for Upstash Redis.", showIf: { field: "NEXT_PUBLIC_ALLOW_RATE_LIMIT", value: "upstash" }, required: true },
      { 
        name: "UPSTASH_REDIS_REST_TOKEN", 
        description: "REST Token for Upstash Redis.", 
        showIf: { field: "NEXT_PUBLIC_ALLOW_RATE_LIMIT", value: "upstash" }, 
        required: true,
        providerHints: [
          { name: "Upstash", url: "https://upstash.com", color: "text-[#00e9a3]", icon: SiUpstash, tier: "Free", info: "Serverless Redis with 10k requests/day free tier." },
        ]
      },
    ],
  },
  {
    id: "payment",
    title: "Payment Module",
    icon: CreditCard,
    color: "text-green-500",
    borderColor: "border-l-green-500",
    description: "Dodo Payments configuration.",
    documentation: [{ label: "Payments", slug: "payments" },
    { label: "Billing", slug: "billing" },
    ],
    fields: [
      { name: "NEXT_PUBLIC_PAYMENT_GATEWAY", description: "The payment gateway you want to use for your app.", required: true },
      { 
        name: "DODO_PAYMENTS_API_KEY", 
        description: "API Key for Dodo Payments.", 
        showIf: { field: "NEXT_PUBLIC_PAYMENT_GATEWAY", value: "dodo" }, 
        required: true,
        providerHints: [
          { name: "Dodo Payments", url: "https://dodopayments.com", color: "text-green-500", icon: CircleDot, tier: "Pay per tx", info: "A global Merchant of Record (MoR) for selling digital products globally." },
        ]
      },
      { name: "DODO_PAYMENTS_WEBHOOK_KEY", description: "Webhook Key for Dodo Payments.", showIf: { field: "NEXT_PUBLIC_PAYMENT_GATEWAY", value: "dodo" }, required: true },
      { name: "DODO_PAYMENTS_RETURN_URL", description: "Return URL after payment completion.", showIf: { field: "NEXT_PUBLIC_PAYMENT_GATEWAY", value: "dodo" }, required: true },
      { name: "DODO_PAYMENTS_ENVIRONMENT", description: "Environment for Dodo Payments (test/live).", showIf: { field: "NEXT_PUBLIC_PAYMENT_GATEWAY", value: "dodo" }, required: true },
      { name: "DODO_CREDITS_PRODUCT_ID", description: "Product ID for credits in Dodo Payments.", showIf: { field: "NEXT_PUBLIC_PAYMENT_GATEWAY", value: "dodo" }, required: true },
      { name: "NEXT_PUBLIC_DODO_PAYMENTS_URL", description: "Public URL for Dodo Payments.", showIf: { field: "NEXT_PUBLIC_DODO_PAYMENTS_URL", value: "dodo" }, required: true },
      { name: "STRIPE_SECRET_KEY", description: "Secret Key for Stripe.", showIf: { field: "NEXT_PUBLIC_PAYMENT_GATEWAY", value: "stripe" }, required: true },
      { 
        name: "STRIPE_WEBHOOK_SECRET", 
        description: "Webhook Secret for Stripe.", 
        showIf: { field: "NEXT_PUBLIC_PAYMENT_GATEWAY", value: "stripe" }, 
        required: true,
        providerHints: [
          { name: "Stripe", url: "https://stripe.com", color: "text-[#635bff]", icon: FaStripe, tier: "Pay per tx", info: "Industry standard payment gateway." },
        ]
      },
    ],
  },
];