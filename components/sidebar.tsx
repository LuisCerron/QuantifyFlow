"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useAuth } from "@/context/AuthContext"
import { cn } from "@/lib/utils"
// Importé un nuevo icono para "Projects"
import { LayoutDashboard, Settings, LogOut, FolderKanban } from "lucide-react" 
import { Button } from "@/components/ui/button"

import { signOut } from "firebase/auth"
import { auth } from "@/lib/firebase"
import { toast } from "sonner"

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { user } = useAuth()

  const navItems = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/projects", label: "Projects", icon: FolderKanban }, 
    { href: "/settings", label: "Settings", icon: Settings },
    // Ícono actualizado para "Projects"
    
  ]

  const handleLogout = async () => {
    const toastId = toast.loading("Cerrando sesión...");
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      await signOut(auth);
      toast.success("Sesión cerrada.", { id: toastId });
      router.replace('/login');
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
      // Es buena idea mostrar un toast de error al usuario también
      toast.error("Error al cerrar sesión.", { id: toastId });
    }
  };

  return (
    // Usamos bg-background y 'border-r' estándar
    <aside className="w-64 bg-background border-r h-screen flex flex-col">
      {/* Logo con 'border-b' estándar y 'text-primary' para destacar */}
      <div className="p-6 border-b">
        <h1 className="text-2xl font-bold text-primary tracking-tight">QuantifyFlow</h1>
      </div>

      {/* Espaciado ajustado a 'space-y-1' para un look más compacto */}
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/")

          return (
            <Link key={item.href} href={item.href} legacyBehavior passHref>
              <Button
                // Estado activo usa 'secondary', inactivo usa 'ghost'
                variant={isActive ? "secondary" : "ghost"}
                className="w-full justify-start gap-3"
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </Button>
            </Link>
          )
        })}
      </nav>

      {/* Footer con 'border-t' estándar */}
      <div className="p-4 border-t space-y-2">
        {/* Email con 'text-muted-foreground' para ser más sutil */}
        <div className="px-3 py-2 text-sm font-medium text-muted-foreground truncate" title={user?.displayName || user?.email || "Usuario"}>
          {user?.displayName || user?.email}
        </div>
        
        <Button 
          variant="ghost" 
          className={cn(
            "w-full justify-start gap-3",
            // Sutil por defecto, pero se vuelve rojo al pasar el cursor
            "text-muted-foreground transition-colors duration-150",
            "hover:text-destructive hover:bg-destructive/10"
          )}
          onClick={handleLogout}
        >
          <LogOut className="w-4 h-4" />
          Logout
        </Button>
      </div>
    </aside>
  )
}