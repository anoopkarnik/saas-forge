const scaffoldTraceRoot = "../../.generated/saas-boilerplate"
const scaffoldTraceIncludes = [
  `${scaffoldTraceRoot}/.eslintrc.js`,
  `${scaffoldTraceRoot}/.github/**/*`,
  `${scaffoldTraceRoot}/apps/**/*`,
  `${scaffoldTraceRoot}/CLAUDE.md`,
  `${scaffoldTraceRoot}/docs/**/*`,
  `${scaffoldTraceRoot}/LICENSE`,
  `${scaffoldTraceRoot}/package.json`,
  `${scaffoldTraceRoot}/packages/**/*`,
  `${scaffoldTraceRoot}/pnpm-lock.yaml`,
  `${scaffoldTraceRoot}/pnpm-workspace.yaml`,
  `${scaffoldTraceRoot}/README.md`,
  `${scaffoldTraceRoot}/tsconfig.json`,
  `${scaffoldTraceRoot}/turbo.json`,
  `${scaffoldTraceRoot}/vitest.workspace.ts`,
]

const scaffoldTraceExcludes = [
  `${scaffoldTraceRoot}/**/.cache/**`,
  `${scaffoldTraceRoot}/**/.next/**`,
  `${scaffoldTraceRoot}/**/.turbo/**`,
  `${scaffoldTraceRoot}/**/.vercel/**`,
  `${scaffoldTraceRoot}/**/build/**`,
  `${scaffoldTraceRoot}/**/coverage/**`,
  `${scaffoldTraceRoot}/**/dist/**`,
  `${scaffoldTraceRoot}/**/node_modules/**`,
  `${scaffoldTraceRoot}/**/out/**`,
]

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@workspace/ui", "@workspace/auth", "@workspace/database"],
  images: {
    remotePatterns: [
      { hostname: 'strapi.bayesian-labs.com', protocol: 'https' },
      { hostname: 'localhost', protocol: 'http' },
      { hostname: "prod-files-secure.s3.us-west-2.amazonaws.com", protocol: "https" },
    ],
    unoptimized: true,
  },
  outputFileTracingIncludes: {
    "/api/scaffold": scaffoldTraceIncludes,
  },
  outputFileTracingExcludes: {
    "/api/scaffold": scaffoldTraceExcludes,
  },
  async headers() {
    return [
      {
        source: "/_next/:path*",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "http://localhost:5173" },
          { key: "Access-Control-Allow-Methods", value: "GET, OPTIONS" },
        ],
      },
    ]
  },
}

export default nextConfig
