"use client"

import { useColorPalette } from "@/lib/theme-context"

export function useTheme() {
  return useColorPalette()
}