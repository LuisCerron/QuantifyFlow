"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useTheme } from "next-themes"

import { useAuth } from "@/context/AuthContext"
import { Sidebar } from "@/components/sidebar"
import { Header } from "@/components/header"
import { MainUISkeleton } from "./MainUISkeleton"

export function MainUILayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth()
  const router = useRouter()
  const { resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/login")
    }
  }, [user, isLoading, router])

  if (isLoading || !mounted) {
    return <MainUISkeleton />
  }

  if (!user) return null

  const isLight = resolvedTheme === "light"

  return (
    <div
      className={`relative h-screen w-screen overflow-hidden transition-colors ${
        isLight ? "bg-white text-black" : "bg-background"
      }`}
    >
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className={`dashboard-ambient ${isLight ? "hidden" : ""}`} />
        <div className={`dashboard-blobs ${isLight ? "hidden" : ""}`}>
          <span className="blob blob-1" />
          <span className="blob blob-2" />
          <span className="blob blob-3" />
        </div>
      </div>

      <Sidebar />
      <Header />

      <div className="flex h-full flex-col lg:pl-64">
        <main className="flex-1 overflow-y-auto pt-14">
          <div className="w-full px-4 py-6 sm:px-6 lg:px-8 2xl:px-12">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}