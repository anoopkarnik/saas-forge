import "@workspace/ui/globals.css"
import { ThemeProvider } from "@workspace/ui/providers/theme-provider"
import { geistSans, geistMono, cyberdyne } from "@workspace/ui/typography/font"
import type { Metadata } from "next";
import { Toaster } from "@workspace/ui/components/shadcn/sonner";
import { Analytics } from "@vercel/analytics/react"
import { GoogleAnalytics } from "@next/third-parties/google";
import { SpeedInsights } from "@vercel/speed-insights/next"
import { TRPCReactProvider } from "@/trpc/client";
import Support from "@/blocks/Support";
import { connection } from "next/server";
import { getSiteUrl } from "@/lib/seo";
import { siteMetadata } from "@/lib/site-config/metadata";
import { getPublicSiteConfig } from "@/lib/site-config/service";
import { SiteConfigProvider } from "@/components/site-config/SiteConfigProvider";
import { FlagsProvider } from "@/components/flags/FlagsProvider";
import { evaluateFlagsForRequest } from "@/lib/flags/flags";

export async function generateMetadata(): Promise<Metadata> {
  return { metadataBase: new URL(getSiteUrl()), ...(await siteMetadata()) };
}


export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>): Promise<React.ReactElement> {
  // Site config changes at runtime (/admin/settings), so never bake it in at build.
  await connection();
  const [config, flags] = await Promise.all([getPublicSiteConfig(), evaluateFlagsForRequest()]);
  const gaId = config["analytics.gaMeasurementId"];

  return (
    <html lang="en" suppressHydrationWarning className={`theme-${config["branding.theme"]}`}>
      <body className={`${geistSans.className} ${geistMono.variable} ${cyberdyne.variable} `}>
        <TRPCReactProvider>
          <SiteConfigProvider config={config}>
            <FlagsProvider flags={flags}>
              <ThemeProvider defaultTheme={config["branding.themeType"]}>
                <a href="#main-content" className="skip-link">Skip to main content</a>
                {children}
                <Support />
                <Toaster />
                <Analytics />
                <SpeedInsights />
                {gaId ? <GoogleAnalytics gaId={gaId} /> : null}
              </ThemeProvider>
            </FlagsProvider>
          </SiteConfigProvider>
        </TRPCReactProvider>
      </body>
    </html>
  )
}
