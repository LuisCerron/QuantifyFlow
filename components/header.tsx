"use client"

import React, { useEffect, useState } from "react"
import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"
import { Moon, Sun, Workflow, Menu } from "lucide-react"

export function Header() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const openSidebar = () => {
    if (typeof window !== "undefined") {
      // Evento personalizado que escuchará el Sidebar
      window.dispatchEvent(new CustomEvent("open-sidebar"))
    }
  }

  return (
    // Header fijo, por encima del contenido
    <header className="fixed top-0 left-0 right-0 lg:left-64 z-50 h-14 bg-background/70 backdrop-blur-md supports-[backdrop-filter]:backdrop-blur-md">
      <div className="mx-auto flex h-14 w-full items-center justify-between px-3 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2">
          {/* Botón menú solo en móvil */}
          <button
            type="button"
            onClick={openSidebar}
            aria-label="Abrir menú"
            className="lg:hidden inline-flex items-center justify-center h-9 w-9 rounded-xl ring-2 ring-neutral-300/80 dark:ring-white/20 bg-background/80 backdrop-blur hover:ring-violet-500/60 transition"
          >
            <Menu className="h-4 w-4" />
          </button>

          <div className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-primary/15 text-primary">
            <Workflow className="h-4 w-4" />
          </div>
          <span className="hidden text-sm font-semibold sm:inline">Bienvenido.</span>
        </div>

        <div className="flex items-center gap-2">
          {mounted ? (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              aria-label={theme === "dark" ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
              className="rounded-full hover:bg-muted"
            >
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
          ) : (
            <div className="h-9 w-9" />
          )}
        </div>
      </div>
    </header>
  )
}