"use client"

import { useTheme as useThemeContext } from "@/lib/theme-context"

export function useTheme() {
  return useThemeContext()
}
