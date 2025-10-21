"use client"

import type React from "react"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/context/AuthContext"
import { Sidebar } from "@/components/sidebar"
import { Header } from "@/components/header"

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/login")
    }
  }, [user, isLoading, router])

  if (isLoading) {
    return (
      <div className="grid min-h-screen place-items-center">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-primary" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) return null

  return (
    // El viewport no scrollea; solo el área principal a la derecha
    <div className="relative h-screen w-screen overflow-hidden bg-background">
      {/* Fondo ambiental con degradados sutiles y orbes difuminados (detrás de todo) */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="dashboard-ambient" />
        <div className="dashboard-blobs">
          <span className="blob blob-1" />
          <span className="blob blob-2" />
          <span className="blob blob-3" />
        </div>
      </div>

      <Sidebar />
      {/* Header fijo fuera del contenedor scrolleable para evitar cualquier “marco” arriba */}
      <Header />

      {/* Panel derecho scrolleable con compensación del header fijo */}
      <div className="flex h-full flex-col lg:pl-64">
        <main className="flex-1 overflow-y-auto pt-14">
          <div className="w-full px-4 sm:px-6 lg:px-8 2xl:px-12 py-6">
            {children}
          </div>
        </main>
      </div>

      {/* Estilos del fondo ambiental */}
      <style jsx global>{`
        .dashboard-ambient {
          position: absolute;
          inset: 0;
          background:
            radial-gradient(60% 45% at 80% 10%, rgba(99, 102, 241, 0.12), transparent 60%),
            radial-gradient(50% 40% at 10% 85%, rgba(34, 211, 238, 0.10), transparent 60%),
            radial-gradient(45% 35% at 30% 30%, rgba(236, 72, 153, 0.10), transparent 60%);
          filter: saturate(1.05);
          animation: ambientShift 26s ease-in-out infinite alternate;
        }
        .dashboard-blobs { position: absolute; inset: 0; overflow: hidden; }
        .blob { position: absolute; border-radius: 9999px; filter: blur(40px); opacity: 0.18; will-change: transform; }
        .blob-1 { width: 32rem; height: 32rem; top: -12rem; right: -8rem; background: #8b5cf6; animation: blobDrift1 38s ease-in-out infinite; }
        .blob-2 { width: 26rem; height: 26rem; bottom: -10rem; left: -8rem; background: #22d3ee; animation: blobDrift2 42s ease-in-out infinite; }
        .blob-3 { width: 22rem; height: 22rem; top: 30%; left: 35%; background: #fb7185; animation: blobDrift3 36s ease-in-out infinite; }
        @keyframes ambientShift { 0%{transform:translate3d(0,0,0) scale(1)} 50%{transform:translate3d(0,-0.5rem,0) scale(1.005)} 100%{transform:translate3d(0,0,0) scale(1)} }
        @keyframes blobDrift1 { 0%,100%{transform:translate3d(0,0,0) scale(1)} 50%{transform:translate3d(-1.5rem,.75rem,0) scale(1.04)} }
        @keyframes blobDrift2 { 0%,100%{transform:translate3d(0,0,0) scale(1)} 50%{transform:translate3d(1rem,-1rem,0) scale(0.97)} }
        @keyframes blobDrift3 { 0%,100%{transform:translate3d(0,0,0) scale(1)} 50%{transform:translate3d(-.75rem,1rem,0) scale(1.03)} }
      `}</style>
    </div>
  )
}