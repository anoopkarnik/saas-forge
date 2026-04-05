"use client"

import { useEffect, useState } from "react"

export type ThemeColor = "blue" | "violet" | "neutral" | "red" | "yellow" | "green" | "orange" | "rose"

const THEME_COLOR_KEY = "theme-color"
const DEFAULT_THEME_COLOR: ThemeColor = (process.env.NEXT_PUBLIC_THEME as ThemeColor) || "green"

export function useThemeColor() {
  const [themeColor, setThemeColorState] = useState<ThemeColor>(DEFAULT_THEME_COLOR)
  const [mounted, setMounted] = useState(false)

  // Load theme color from localStorage on mount
  useEffect(() => {
    setMounted(true)
    const stored = localStorage.getItem(THEME_COLOR_KEY) as ThemeColor | null
    if (stored && isValidThemeColor(stored)) {
      setThemeColorState(stored)
      applyThemeColor(stored)
    } else {
      applyThemeColor(DEFAULT_THEME_COLOR)
    }
  }, [])

  const setThemeColor = (color: ThemeColor) => {
    setThemeColorState(color)
    localStorage.setItem(THEME_COLOR_KEY, color)
    applyThemeColor(color)
  }

  return { themeColor, setThemeColor, mounted }
}

function isValidThemeColor(color: string): color is ThemeColor {
  return ["blue", "violet", "neutral", "red", "yellow", "green", "orange", "rose"].includes(color)
}

function applyThemeColor(color: ThemeColor) {
  const html = document.documentElement

  // Remove all theme color classes
  html.classList.remove(
    "theme-blue",
    "theme-violet",
    "theme-neutral",
    "theme-red",
    "theme-yellow",
    "theme-green",
    "theme-orange",
    "theme-rose"
  )

  // Add the new theme color class
  html.classList.add(`theme-${color}`)
}
