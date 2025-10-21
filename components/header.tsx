// src/components/header.tsx
"use client"

import { useState, useEffect } from "react"; // 👈 1. Import hooks
import { useTheme } from 'next-themes';
// useColorPalette is not used in this file, so it can be removed
// import { useColorPalette } from '@/lib/theme-context'; 
import { Button } from "@/components/ui/button"
import { Moon, Sun } from "lucide-react"

export function Header() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false); // 👈 2. Create a mounted state

  // 👈 3. Set mounted to true only on the client
  useEffect(() => {
    setMounted(true);
  }, []);

  // 👈 4. Don't render the button on the server or during the initial client render
  if (!mounted) {
    // You can return null or a placeholder to avoid layout shift
    return <div className="w-10 h-10" />; // Placeholder with same size as button
  }

  return (
    <header className="bg-card border-b border-border h-16 flex items-center justify-between px-6">
      <div className="flex-1" />
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setTheme(theme === "light" ? "dark" : "light")}
        className="rounded-full"
      >
        {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
      </Button>
    </header>
  )
}