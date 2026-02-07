/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@workspace/ui"],
    images:{
      remotePatterns: [
          {hostname: 'strapi.bayesian-labs.com', protocol:'https'},
          {hostname: 'localhost', protocol:'http'},
          {hostname: "prod-files-secure.s3.us-west-2.amazonaws.com", protocol: "https"},
      ],
      unoptimized: true,
    },
}

export default nextConfig
