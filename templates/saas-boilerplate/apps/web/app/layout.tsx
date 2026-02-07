import "@workspace/ui/globals.css"
import { ThemeProvider } from "@workspace/ui/providers/theme-provider"
import { geistSans, geistMono, cyberdyne} from "@workspace/ui/typography/font"
import type { Metadata } from "next";
import { Toaster } from "@workspace/ui/components/shadcn/sonner";
import { Analytics } from "@vercel/analytics/react"
import { GoogleAnalytics } from "@next/third-parties/google";
import { SpeedInsights } from "@vercel/speed-insights/next"
import { TRPCReactProvider } from "@/trpc/client";
import Support from "@/blocks/Support";

const THEME = process.env.NEXT_PUBLIC_THEME ?? "neutral";

const themeClass = `theme-${THEME}-dark`;

export const metadata: Metadata = {
  title: "SaaS Forge",
  description: "Boilerplate to build and deploy SaaS products quickly.",
};


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${themeClass} ${geistSans.className} ${geistMono.variable} ${cyberdyne.variable} `}>
        <TRPCReactProvider>
          <ThemeProvider>
            {children}
            <Support />
            <Toaster />
            <Analytics />
            <SpeedInsights />
            <GoogleAnalytics gaId={process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_MEASUREMENT_ID as string}/>
          </ThemeProvider>
        </TRPCReactProvider>
      </body>
    </html>
  )
}
