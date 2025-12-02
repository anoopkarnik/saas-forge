import "@workspace/ui/globals.css"
import { ThemeProvider } from "@workspace/ui/providers/theme-provider"
import { geistSans, geistMono, cyberdyne} from "@workspace/ui/typography/font"

const THEME = process.env.NEXT_PUBLIC_THEME ?? "neutral";

const themeClass = `theme-${THEME}-dark`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${themeClass} ${geistSans.className} ${geistMono.variable} ${cyberdyne.variable} `}>
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
