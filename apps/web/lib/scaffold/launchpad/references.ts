/** Official references paired with the starter's own file paths in each task. */
export const GUIDE_REFERENCES = {
  starter: {
    label: "Next.js project setup",
    url: "https://nextjs.org/docs/app/getting-started/installation",
  },
  postgres: {
    label: "PostgreSQL documentation",
    url: "https://www.postgresql.org/docs/current/",
  },
  prisma: {
    label: "Prisma development and production migrations",
    url: "https://www.prisma.io/docs/orm/migrations/applying-a-migration",
  },
  dodo: {
    label: "Dodo Payments integration guide",
    url: "https://docs.dodopayments.com/developer-resources/integration-guide",
  },
  stripe: {
    label: "Stripe checkout and webhooks",
    url: "https://docs.stripe.com/payments/checkout",
  },
  resend: {
    label: "Resend domain verification",
    url: "https://resend.com/docs/dashboard/domains/introduction",
  },
  upstash: {
    label: "Upstash Redis setup",
    url: "https://upstash.com/docs/redis/overall/getstarted",
  },
  r2: {
    label: "Cloudflare R2 setup",
    url: "https://developers.cloudflare.com/r2/get-started/",
  },
  vercel_blob: {
    label: "Vercel Blob setup",
    url: "https://vercel.com/docs/vercel-blob",
  },
  auth: {
    label: "Better Auth social sign-in",
    url: "https://www.better-auth.com/docs/concepts/oauth",
  },
  google: {
    label: "Google OAuth web application setup",
    url: "https://developers.google.com/identity/protocols/oauth2/web-server",
  },
  github: {
    label: "GitHub OAuth applications",
    url: "https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/creating-an-oauth-app",
  },
  linkedin: {
    label: "LinkedIn OpenID Connect sign-in",
    url: "https://learn.microsoft.com/en-us/linkedin/consumer/integrations/self-serve/sign-in-with-linkedin-v2",
  },
  ai: {
    label: "AI SDK provider configuration",
    url: "https://ai-sdk.dev/docs/foundations/providers-and-models",
  },
  inngest: {
    label: "Inngest local development",
    url: "https://www.inngest.com/docs/local-development",
  },
  python: {
    label: "uv installation and Python setup",
    url: "https://docs.astral.sh/uv/getting-started/installation/",
  },
  desktop: {
    label: "Electron distribution",
    url: "https://www.electronjs.org/docs/latest/tutorial/application-distribution",
  },
  mobile: {
    label: "Expo development",
    url: "https://docs.expo.dev/get-started/start-developing/",
  },
  vercel: {
    label: "Vercel monorepo deployment",
    url: "https://vercel.com/docs/monorepos",
  },
  docker: {
    label: "Docker Compose production guidance",
    url: "https://docs.docker.com/compose/how-tos/production/",
  },
  backup: {
    label: "PostgreSQL backup and recovery",
    url: "https://www.postgresql.org/docs/current/backup.html",
  },
  betterstack: {
    label: "BetterStack log sources",
    url: "https://betterstack.com/docs/logs/",
  },
  analytics: {
    label: "Google Analytics property setup",
    url: "https://support.google.com/analytics/answer/9304153",
  },
  ga4: {
    label: "Google Analytics Data API setup",
    url: "https://developers.google.com/analytics/devguides/reporting/data/v1/quickstart-client-libraries",
  },
  pagespeed: {
    label: "PageSpeed Insights setup",
    url: "https://developers.google.com/speed/docs/insights/v5/get-started",
  },
} satisfies Record<string, { label: string; url: string }>;
