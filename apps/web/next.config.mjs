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
    "/api/scaffold": ["../../templates/saas-boilerplate/**/*"],
  },
  outputFileTracingExcludes: {
    "/api/scaffold": [
      "../../templates/saas-boilerplate/**/node_modules/**",
    ],
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
