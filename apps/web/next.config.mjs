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

const scaffoldTraceExcludes = [
  ...scaffoldTraceRoots.flatMap((root) => [
    `${root}/**/.cache/**`,
    `${root}/**/.next/**`,
    `${root}/**/.turbo/**`,
    `${root}/**/.vercel/**`,
    `${root}/**/build/**`,
    `${root}/**/coverage/**`,
    `${root}/**/dist/**`,
    `${root}/**/node_modules/**`,
    `${root}/**/out/**`,
    `${root}/**/.venv/**`,
    `${root}/**/__pycache__/**`,
    `${root}/**/.pytest_cache/**`,
    `${root}/**/.ruff_cache/**`,
  ]),
  "**/node_modules/.cache/**",
  "**/node_modules/.bin/**",
  "**/node_modules/.pnpm-debug.log",
  "**/.next/cache/**",
  "apps/web/.next/cache/**",
  "apps/web/public/**",
]

// Build artifacts no serverless function needs at runtime. lib/scaffold-modules.ts
// reaches the filesystem through dynamically computed paths (resolveWorkspacePath
// walks [".", "..", "../.."] from process.cwd()), which the file tracer cannot
// resolve statically, so it over-includes the workspace into every route that
// transitively imports it — including /api/trpc, via projectProcedures.
// NOTE: these globs resolve relative to the app directory (apps/web), not to
// outputFileTracingRoot — hence the ../../ hops for monorepo-level paths.
const globalTraceExcludes = [
  "**/.venv/**",
  "**/__pycache__/**",
  "**/.pytest_cache/**",
  "**/.ruff_cache/**",
  "**/coverage/**",
  "**/.turbo/**",
  "**/.next/cache/**",
  "public/**",
  "tests/**",
  // sharp ships a prebuilt binary per platform (~250MB in total). Vercel runs
  // linux-x64 glibc, so only @img/sharp-linux-x64 + its libvips are needed.
  // Revisit if the deploy target ever changes (arm64, musl).
  "../../node_modules/.pnpm/@img+sharp-darwin-*/**",
  "../../node_modules/.pnpm/@img+sharp-libvips-darwin-*/**",
  "../../node_modules/.pnpm/@img+sharp-win32-*/**",
  "../../node_modules/.pnpm/@img+sharp-wasm32*/**",
  "../../node_modules/.pnpm/@img+sharp-linuxmusl-*/**",
  "../../node_modules/.pnpm/@img+sharp-libvips-linuxmusl-*/**",
  "../../node_modules/.pnpm/@img+sharp-linux-arm*/**",
  "../../node_modules/.pnpm/@img+sharp-libvips-linux-arm*/**",
  "../../node_modules/.pnpm/@img+sharp-linux-ppc64*/**",
  "../../node_modules/.pnpm/@img+sharp-libvips-linux-ppc64*/**",
  "../../node_modules/.pnpm/@img+sharp-linux-riscv64*/**",
  "../../node_modules/.pnpm/@img+sharp-libvips-linux-riscv64*/**",
  "../../node_modules/.pnpm/@img+sharp-linux-s390x*/**",
  "../../node_modules/.pnpm/@img+sharp-libvips-linux-s390x*/**",
]

// Only the scaffold routes package starter source; nothing else needs the
// template trees or the Python backend.
const nonScaffoldTraceExcludes = [
  ...globalTraceExcludes,
  "../../templates/**",
  "../../.generated/**",
  "../../apps/backend/**",
]

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: [
    "@workspace/ui",
    "@workspace/auth",
    "@workspace/database",
    "@workspace/ai",
    "@workspace/cms",
    "@workspace/email",
    "@workspace/observability",
  ],
  output: "standalone",
  outputFileTracingRoot: monorepoRoot,
  images: {
    remotePatterns: [
      { hostname: 'strapi.bayesian-labs.com', protocol: 'https' },
      { hostname: 'localhost', protocol: 'http' },
      { hostname: "prod-files-secure.s3.us-west-2.amazonaws.com", protocol: "https" },
    ],
  },
  outputFileTracingIncludes: {
    "/api/scaffold": scaffoldTraceIncludes,
  },
  outputFileTracingExcludes: {
    "**": globalTraceExcludes,
    "/api/trpc/[trpc]": nonScaffoldTraceExcludes,
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
