"use client"

import type React from "react"
import { createContext, useContext, useEffect, useState } from "react"
import { db } from "@/lib/firebase"
import { doc, updateDoc } from "firebase/firestore"

export type ColorPalette = "default" | "blue" | "green" | "purple"

interface ColorPaletteContextType { // Renombrado
  colorPalette: ColorPalette
  setColorPalette: (palette: ColorPalette) => Promise<void>
}
const ColorPaletteContext = createContext<ColorPaletteContextType | undefined>(undefined)

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
// ¡Componente renombrado y simplificado!
export function ColorPaletteProvider({
  children,
  initialPalette = "default",
  userId,
}: {
  children: React.ReactNode
  initialPalette?: ColorPalette
  userId?: string
}) {
  const [colorPalette, setColorPaletteState] = useState<ColorPalette>(initialPalette)

  // useEffect para leer solo la paleta del localStorage
  useEffect(() => {
    const savedPalette = localStorage.getItem("colorPalette") as ColorPalette | null
    if (savedPalette) {
      setColorPaletteState(savedPalette)
    }
  }, []) // Se ejecuta solo una vez al montar

  // useEffect para aplicar los estilos de la paleta
  useEffect(() => {
    const root = document.documentElement
    const palette = colorPaletteConfig[colorPalette]
    Object.entries(palette).forEach(([key, value]) => {
      root.style.setProperty(key, value)
    })
  }, [colorPalette]) // Se ejecuta solo cuando la paleta cambia

  // La función para cambiar la paleta se mantiene casi igual
  const handleSetColorPalette = async (newPalette: ColorPalette) => {
    setColorPaletteState(newPalette)
    localStorage.setItem("colorPalette", newPalette)
    if (userId) {
      try {
        await updateDoc(doc(db, "users", userId), { "preferences.colorPalette": newPalette });
      } catch (error) {
        console.error("Failed to save color palette preference:", error);
      }
    }
  }

  return (
    <ColorPaletteContext.Provider
      value={{ colorPalette, setColorPalette: handleSetColorPalette }}
    >
      {children}
    </ColorPaletteContext.Provider>
  )
}

// Hook renombrado para usar el nuevo contexto
export function useColorPalette() {
  const context = useContext(ColorPaletteContext)
  if (context === undefined) {
    throw new Error("useColorPalette must be used within a ColorPaletteProvider")
  }
  return context
}