"use client"

import React, { useEffect, useMemo, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { toast } from "sonner"
import { signOut } from "firebase/auth"

import { useAuth } from "@/context/AuthContext"
import { auth } from "@/lib/firebase"

import {
  LayoutDashboard,
  Settings,
  FolderKanban,
} from "lucide-react"
import { Panel } from "./sidebar/Panel"

type NavItem = {
  href: string
  label: string
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>
}

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { user } = useAuth()
  const [openMobile, setOpenMobile] = useState(false)

  const navItems: readonly NavItem[] = useMemo(
    () => [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/projects", label: "Proyectos", icon: FolderKanban },
      { href: "/settings", label: "Configuración", icon: Settings },
    ],
    []
  )

  useEffect(() => {
    setOpenMobile(false)
  }, [pathname])

  useEffect(() => {
    const handler = () => setOpenMobile(true)
    window.addEventListener("open-sidebar" as any, handler as EventListener)
    return () => window.removeEventListener("open-sidebar" as any, handler as EventListener)
  }, [])

  const handleLogout = async () => {
    const toastId = toast.loading("Cerrando sesión...")
    try {
      await fetch("/api/auth/logout", { method: "POST" })
      await signOut(auth)
      toast.success("Sesión cerrada.", { id: toastId })
      window.location.href = "/login"
    } catch (error) {
      console.error("Error al cerrar sesión:", error)
      toast.error("Error al cerrar sesión.", { id: toastId })
    }
  }

  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 lg:block">
        <Panel
          navItems={navItems}
          pathname={pathname}
          userDisplayName={user?.displayName}
          userEmail={user?.email}
          onLogout={handleLogout}
        />
      </aside>

      <AnimatePresence>
        {openMobile && (
          <>
            <motion.div
              className="fixed inset-0 z-[60] bg-black/45 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpenMobile(false)}
            />
            <motion.aside
              className="fixed inset-y-0 left-0 z-[70] w-[88vw] max-w-[18rem] shadow-2xl lg:hidden"
              initial={{ x: -28, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -28, opacity: 0 }}
              transition={{ type: "spring", stiffness: 320, damping: 32 }}
              role="dialog"
              aria-modal="true"
              aria-label="Navegación"
            >
              <Panel
                navItems={navItems}
                pathname={pathname}
                userDisplayName={user?.displayName}
                userEmail={user?.email}
                onLogout={handleLogout}
                onItemClick={() => setOpenMobile(false)}
              />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  )
}