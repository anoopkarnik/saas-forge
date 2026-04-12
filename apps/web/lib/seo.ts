import type { Metadata } from "next";

const DEFAULT_DESCRIPTION =
  "Boilerplate to build and deploy SaaS products quickly.";
const DEFAULT_OG_IMAGE = "/cms/hero_0.png";

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "");
}

export function getSiteUrl(): string {
  const configuredUrl = process.env.NEXT_PUBLIC_URL?.trim();
  if (configuredUrl) {
    return trimTrailingSlash(configuredUrl);
  }

  return "http://localhost:3000";
}

export function getSiteName(): string {
  return process.env.NEXT_PUBLIC_SAAS_NAME?.trim() || "SaaS Forge";
}

export function getSiteDescription(): string {
  return process.env.NEXT_PUBLIC_SITE_DESCRIPTION?.trim() || DEFAULT_DESCRIPTION;
}

export function getCanonicalUrl(pathname = "/"): string {
  const siteUrl = getSiteUrl();
  const normalizedPath = pathname.startsWith("/") ? pathname : `/${pathname}`;
  return `${siteUrl}${normalizedPath === "/" ? "" : normalizedPath}`;
}

export function getDefaultOgImageUrl(): string {
  return getCanonicalUrl(DEFAULT_OG_IMAGE);
}

export function createSeoMetadata({
  title,
  description = getSiteDescription(),
  pathname = "/",
}: {
  title?: string;
  description?: string;
  pathname?: string;
} = {}): Metadata {
  const siteName = getSiteName();
  const pageTitle = title ? `${title} | ${siteName}` : siteName;
  const canonicalUrl = getCanonicalUrl(pathname);
  const ogImage = getDefaultOgImageUrl();

  return {
    title: pageTitle,
    description,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title: pageTitle,
      description,
      url: canonicalUrl,
      siteName,
      images: [
        {
          url: ogImage,
          width: 1920,
          height: 1080,
          alt: `${siteName} preview`,
        },
      ],
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: pageTitle,
      description,
      images: [ogImage],
    },
  };
}

export const PUBLIC_SEO_STATIC_ROUTES = [
  "/landing",
  "/landing/legal/privacy-policy",
  "/landing/legal/terms-of-service",
  "/landing/legal/cancellation-refund-policies",
  "/landing/legal/contact-us",
  "/sign-in",
  "/sign-up",
] as const;
