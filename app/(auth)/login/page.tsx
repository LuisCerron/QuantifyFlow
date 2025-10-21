"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { signInWithEmailAndPassword } from "firebase/auth"
import { auth } from "@/lib/firebase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"
import { CheckSquare, Github, Mail, Lock, EyeOff, Eye, Workflow } from "lucide-react"
import { toast } from "sonner"


export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("") 
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    // Usamos un toast de carga para mejor feedback
    const toastId = toast.loading("Iniciando sesión...");

    try {
      // 1. Autenticar con Firebase
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      console.log("✅ Autenticación con Firebase exitosa."); // <-- Log para ti

      const user = userCredential.user;
      const token = await user.getIdToken();

      // 2. Llamar a tu API
      console.log("⏳ Llamando a la API /api/auth/login..."); // <-- Log para ti
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      
      // 3. VERIFICACIÓN CRÍTICA
      if (!response.ok) {
        // Leemos el cuerpo del error que envía tu API para saber qué pasó
        const errorData = await response.json().catch(() => ({ message: "Error desconocido en el servidor." }));
        console.error("❌ Error en la API:", response.status, errorData); // <-- Log CLAVE para ti
        
        // Lanzamos un error con el mensaje del servidor
        throw new Error(errorData.message || "Fallo al crear la sesión en el servidor.");
      }
      
      console.log("✅ Sesión creada en el servidor exitosamente."); // <-- Log para ti
      toast.success("¡Inicio de sesión exitoso!", { id: toastId }); // <-- Notificación para el usuario

      // 4. Redirigir
      router.replace("/dashboard");

    } catch (err) {
      console.error("🐛 Error en el proceso de login:", err); // <-- Log del error completo para ti
      
      let errorMessage = "Ocurrió un error inesperado.";
      if (err instanceof Error) {
        if (err.message.includes("auth/invalid-credential")) {
          errorMessage = "Correo o contraseña incorrectos.";
        } else {
          // Usamos el mensaje del error que lanzamos arriba
          errorMessage = err.message;
        }
      }
      
      setError(errorMessage);
      toast.error(errorMessage, { id: toastId }); // <-- Notificación de error para el usuario

    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full min-h-screen font-sans lg:grid lg:grid-cols-2">
      {/* Columna Derecha: Formulario de Login */}
      <div className="flex items-center justify-center p-6 sm:p-12 bg-background transition-colors duration-500">
        <div className="w-full max-w-md space-y-8">
          <div className="text-left">
             <Workflow className="h-8 w-8 mb-4 text-primary" />
            <h1 className="text-3xl font-bold text-foreground tracking-tight">¡Bienvenido de nuevo!</h1>
            <p className="text-muted-foreground mt-2">Ingresa tus credenciales para acceder a tu panel.</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@email.com"
                required
                className="w-full pl-10 pr-4 py-3 bg-input border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background transition-shadow"
              />
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Contraseña"
                required
                className="w-full pl-10 pr-10 py-3 bg-input border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background transition-shadow"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>

            {error && <p className="text-sm text-destructive font-medium text-center animate-shake">{error}</p>}
            
            <div className="flex items-center justify-end">
                 <Link href="/forgot-password" className="text-sm font-medium text-primary hover:underline underline-offset-4">
                    ¿Olvidaste tu contraseña?
                 </Link>
            </div>

            <button type="submit" className="w-full py-3 font-semibold text-primary-foreground bg-primary rounded-lg shadow-sm hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background transition-all transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed" disabled={loading}>
              {loading ? (
                <div className="flex justify-center items-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Ingresando...
                </div>
              ) : "Iniciar Sesión"}
            </button>
          </form>
          
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                O continúa con
              </span>
            </div>
          </div>

          <button type="button" className="w-full flex items-center justify-center gap-2 py-3 font-semibold border border-border rounded-lg text-foreground bg-secondary hover:bg-muted focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background transition-all transform hover:scale-[1.02]">
            <Github className="h-5 w-5" />
            GitHub
          </button>

          <p className="text-sm text-center text-muted-foreground">
            ¿No tienes una cuenta?{" "}
            <Link href="/register" className="font-semibold text-primary hover:underline underline-offset-4">
              Regístrate aquí
            </Link>
          </p>
        </div>
      </div>
      {/* Columna Izquierda: Branding y Bienvenida */}
      <div className="hidden lg:flex flex-col items-center justify-center bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 p-10 text-center text-white relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full bg-black/30 z-0"></div>
        <div className="z-10">
          <div className="flex items-center justify-center gap-4 mb-6">
              <Workflow className="h-12 w-12" />
              <h1 className="text-5xl font-bold tracking-tight">QuantifyFlow</h1>
          </div>
          <p className="text-lg max-w-md text-white/90">
            Organiza, colabora y alcanza tus metas. La plataforma definitiva para llevar tus proyectos al siguiente nivel.
          </p>
        </div>
        <div className="mt-auto text-sm text-white/70 z-10">
            © {new Date().getFullYear()} QuantifyFlow Inc.
        </div>
      </div>
    </div>
  )
}
