"use client"

import * as React from "react"
import { MotionConfig } from "framer-motion"
import { ThemeProvider as NextThemesProvider } from "next-themes"

export function ThemeProvider({
  children,
  defaultTheme: configuredTheme,
  ...props
}: React.ComponentProps<typeof NextThemesProvider>) {
  // Apps with runtime site config pass `defaultTheme`; the env var is the fallback.
  const defaultTheme =
    configuredTheme ??
    (typeof process !== "undefined" ? process.env?.NEXT_PUBLIC_THEME_TYPE || "system" : "system")

  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme={defaultTheme}
      enableSystem={defaultTheme === "system"}
      disableTransitionOnChange
      enableColorScheme
      {...props}
    >
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
    </NextThemesProvider>
  )
}
