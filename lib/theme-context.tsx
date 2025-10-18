"use client"

import type React from "react"
import { createContext, useContext, useEffect, useState } from "react"
import { db } from "@/lib/firebase"
import { doc, updateDoc } from "firebase/firestore"

export type Theme = "light" | "dark"
export type ColorPalette = "default" | "blue" | "green" | "purple"

interface ThemeContextType {
  theme: Theme
  colorPalette: ColorPalette
  setTheme: (theme: Theme) => Promise<void>
  setColorPalette: (palette: ColorPalette) => Promise<void>
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

const colorPaletteConfig: Record<ColorPalette, Record<string, string>> = {
  default: {
    "--primary": "oklch(0.205 0 0)",
    "--primary-foreground": "oklch(0.985 0 0)",
    "--accent": "oklch(0.97 0 0)",
    "--accent-foreground": "oklch(0.205 0 0)",
  },
  blue: {
    "--primary": "oklch(0.5 0.15 250)",
    "--primary-foreground": "oklch(0.985 0 0)",
    "--accent": "oklch(0.7 0.1 250)",
    "--accent-foreground": "oklch(0.205 0 0)",
  },
  green: {
    "--primary": "oklch(0.5 0.15 150)",
    "--primary-foreground": "oklch(0.985 0 0)",
    "--accent": "oklch(0.7 0.1 150)",
    "--accent-foreground": "oklch(0.205 0 0)",
  },
  purple: {
    "--primary": "oklch(0.5 0.15 290)",
    "--primary-foreground": "oklch(0.985 0 0)",
    "--accent": "oklch(0.7 0.1 290)",
    "--accent-foreground": "oklch(0.205 0 0)",
  },
}

export function ThemeProvider({
  children,
  initialTheme = "light",
  initialPalette = "default",
  userId,
}: {
  children: React.ReactNode
  initialTheme?: Theme
  initialPalette?: ColorPalette
  userId?: string
}) {
  const [theme, setThemeState] = useState<Theme>(initialTheme)
  const [colorPalette, setColorPaletteState] = useState<ColorPalette>(initialPalette)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const savedTheme = localStorage.getItem("theme") as Theme | null
    const savedPalette = localStorage.getItem("colorPalette") as ColorPalette | null

    if (savedTheme) setThemeState(savedTheme)
    if (savedPalette) setColorPaletteState(savedPalette)
  }, [])

  useEffect(() => {
    if (!mounted) return

    const root = document.documentElement
    if (theme === "dark") {
      root.classList.add("dark")
    } else {
      root.classList.remove("dark")
    }

    const palette = colorPaletteConfig[colorPalette]
    Object.entries(palette).forEach(([key, value]) => {
      root.style.setProperty(key, value)
    })
  }, [theme, colorPalette, mounted])

  const handleSetTheme = async (newTheme: Theme) => {
    setThemeState(newTheme)
    localStorage.setItem("theme", newTheme)

    if (userId) {
      try {
        await updateDoc(doc(db, "users", userId), {
          "preferences.theme": newTheme,
        })
      } catch (error) {
        console.error("Failed to save theme preference:", error)
      }
    }
  }

  const handleSetColorPalette = async (newPalette: ColorPalette) => {
    setColorPaletteState(newPalette)
    localStorage.setItem("colorPalette", newPalette)

    if (userId) {
      try {
        await updateDoc(doc(db, "users", userId), {
          "preferences.colorPalette": newPalette,
        })
      } catch (error) {
        console.error("Failed to save color palette preference:", error)
      }
    }
  }

  return (
    <ThemeContext.Provider
      value={{
        theme,
        colorPalette,
        setTheme: handleSetTheme,
        setColorPalette: handleSetColorPalette,
      }}
    >
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider")
  }
  return context
}
