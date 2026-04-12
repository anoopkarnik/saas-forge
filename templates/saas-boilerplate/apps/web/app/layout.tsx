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
import { createSeoMetadata, getSiteUrl } from "@/lib/seo";

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  ...createSeoMetadata(),
};


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>): React.ReactElement {
  const themeColor = process.env.NEXT_PUBLIC_THEME || "green";
  const gaId = process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_MEASUREMENT_ID;

  return (
    <html lang="en" suppressHydrationWarning className={`theme-${themeColor}`}>
      <body className={`${geistSans.className} ${geistMono.variable} ${cyberdyne.variable} `}>
        <TRPCReactProvider>
          <ThemeProvider>
            {children}
            <Support />
            <Toaster />
            <Analytics />
            <SpeedInsights />
            {gaId ? <GoogleAnalytics gaId={gaId} /> : null}
          </ThemeProvider>
        </TRPCReactProvider>
      </body>
    </html>
  )
}
