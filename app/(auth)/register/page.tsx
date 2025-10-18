"use client"

import type React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { createUserWithEmailAndPassword } from "firebase/auth"
import { auth, db } from "@/lib/firebase"
import { doc, setDoc } from "firebase/firestore"
import Link from "next/link"
import { Github, Mail, Lock, EyeOff, Eye, Workflow, User } from "lucide-react"

export default function RegisterPage() {
  const [displayName, setDisplayName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const router = useRouter()

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden.")
      return
    }
    setLoading(true)
    setError("")

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password)
      const user = userCredential.user

      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        email: user.email,
        displayName,
        preferences: {
          theme: "light",
          colorPalette: "default",
        },
        createdAt: new Date(),
      })

      router.push("/onboarding")
    } catch (err) {
      let errorMessage = "Fallo en el registro. Por favor, inténtalo de nuevo."
      if (err instanceof Error) {
        if (err.message.includes("auth/email-already-in-use")) {
          errorMessage = "Este correo electrónico ya está en uso."
        } else if (err.message.includes("auth/weak-password")) {
          errorMessage = "La contraseña debe tener al menos 6 caracteres."
        }
      }
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full min-h-screen font-sans lg:grid lg:grid-cols-2">
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

      {/* Columna Derecha: Formulario de Registro */}
      <div className="flex items-center justify-center p-6 sm:p-12 bg-background transition-colors duration-500">
        <div className="w-full max-w-md space-y-8">
          <div className="text-left">
            <Workflow className="h-8 w-8 mb-4 text-primary" />
            <h1 className="text-3xl font-bold text-foreground tracking-tight">Crea tu cuenta</h1>
            <p className="text-muted-foreground mt-2">Únete a nosotros para empezar a gestionar tus proyectos.</p>
          </div>

          <form onSubmit={handleRegister} className="space-y-4">
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <input
                id="displayName"
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Nombre completo"
                required
                className="w-full pl-10 pr-4 py-3 bg-input border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background transition-shadow"
              />
            </div>
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
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <input
                id="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirmar contraseña"
                required
                className="w-full pl-10 pr-10 py-3 bg-input border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background transition-shadow"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                aria-label={showConfirmPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
              >
                {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>

            {error && <p className="text-sm text-destructive font-medium text-center animate-shake">{error}</p>}

            <button type="submit" className="w-full py-3 font-semibold text-primary-foreground bg-primary rounded-lg shadow-sm hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background transition-all transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed" disabled={loading}>
              {loading ? (
                <div className="flex justify-center items-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Creando cuenta...
                </div>
              ) : "Crear cuenta"}
            </button>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                O regístrate con
              </span>
            </div>
          </div>

          <button type="button" className="w-full flex items-center justify-center gap-2 py-3 font-semibold border border-border rounded-lg text-foreground bg-secondary hover:bg-muted focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background transition-all transform hover:scale-[1.02]">
            <Github className="h-5 w-5" />
            GitHub
          </button>

          <p className="text-sm text-center text-muted-foreground">
            ¿Ya tienes una cuenta?{" "}
            <Link href="/login" className="font-semibold text-primary hover:underline underline-offset-4">
              Inicia sesión
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}