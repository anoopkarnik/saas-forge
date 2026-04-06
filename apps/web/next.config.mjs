import path from "path"
import { fileURLToPath } from "url"

const appRoot = path.dirname(fileURLToPath(import.meta.url))
const monorepoRoot = path.join(appRoot, "../..")
const scaffoldTraceRoots = [
  "../../.generated/saas-boilerplate",
  "../../templates/saas-boilerplate",
]
const scaffoldTraceEntries = [
  ".eslintrc.js",
  ".gitignore",
  ".github/**/*",
  "apps/**/*",
  "CLAUDE.md",
  "docs/**/*",
  "LICENSE",
  "package.json",
  "packages/**/*",
  "pnpm-lock.yaml",
  "pnpm-workspace.yaml",
  "README.md",
  "tsconfig.json",
  "turbo.json",
  "vitest.workspace.ts",
]
const scaffoldTraceIncludes = [
  ...scaffoldTraceRoots.flatMap((root) =>
    scaffoldTraceEntries.map((entry) => `${root}/${entry}`),
  ),
  "../../template-sync.manifest.json",
]

const scaffoldTraceExcludes = scaffoldTraceRoots.flatMap((root) => [
  `${root}/**/.cache/**`,
  `${root}/**/.next/**`,
  `${root}/**/.turbo/**`,
  `${root}/**/.vercel/**`,
  `${root}/**/build/**`,
  `${root}/**/coverage/**`,
  `${root}/**/dist/**`,
  `${root}/**/node_modules/**`,
  `${root}/**/out/**`,
])

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@workspace/ui", "@workspace/auth", "@workspace/database"],
  outputFileTracingRoot: monorepoRoot,
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
