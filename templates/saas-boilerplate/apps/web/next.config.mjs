import createNextIntlPlugin from "next-intl/plugin";

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: [
    "@workspace/ui",
    "@workspace/auth",
    "@workspace/database",
    "@workspace/i18n",
    // scaffold:begin billing
    "@workspace/billing",
    // scaffold:end billing
    // scaffold:begin notifications
    "@workspace/notifications",
    // scaffold:end notifications
    // scaffold:begin audit_log
    "@workspace/audit",
    // scaffold:end audit_log
    // scaffold:begin webhooks
    "@workspace/webhooks",
    // scaffold:end webhooks
    // scaffold:begin feature_flags
    "@workspace/flags",
    // scaffold:end feature_flags
    // scaffold:begin onboarding
    "@workspace/onboarding",
    // scaffold:end onboarding
    // scaffold:begin mcp
    "@workspace/mcp",
    // scaffold:end mcp
  ],
  output: "standalone",
  images: {
    remotePatterns: [
      { hostname: "strapi.bayesian-labs.com", protocol: "https" },
      { hostname: "localhost", protocol: "http" },
      {
        hostname: "prod-files-secure.s3.us-west-2.amazonaws.com",
        protocol: "https",
      },
    ],
    unoptimized: true,
  },
  async headers() {
    return [
      {
        source: "/_next/:path*",
        headers: [
          {
            key: "Access-Control-Allow-Origin",
            value: "http://localhost:5173",
          },
          { key: "Access-Control-Allow-Methods", value: "GET, OPTIONS" },
        ],
      },
    ];
  },
};

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

export default withNextIntl(nextConfig);
