import type { Metadata } from "next";
import { createSeoMetadata } from "@/lib/seo";
import { getSiteConfig } from "@/lib/site-config/service";

/** `createSeoMetadata` with the product name and description admins set at runtime. */
export async function siteMetadata(options: Parameters<typeof createSeoMetadata>[0] = {}): Promise<Metadata> {
  const config = await getSiteConfig();
  return createSeoMetadata({
    ...options,
    siteName: config["branding.saasName"],
    description: options.description ?? config["branding.description"],
  });
}
