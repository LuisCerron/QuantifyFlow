"use client"

import type React from "react"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import {
  createUserWithEmailAndPassword,
  signInWithPopup,
  GithubAuthProvider,
} from "firebase/auth"
import { auth, db } from "@/lib/firebase"
import { doc, getDoc, setDoc } from "firebase/firestore"
import Link from "next/link"
import {
  Github,
  Mail,
  Lock,
  EyeOff,
  Eye,
  Workflow,
  User,
  Sun,
  Moon,
  CheckCircle2,
  Circle,
} from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export default function RegisterPage() {
  const router = useRouter()

  // UI state
  const [displayName, setDisplayName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loadingEmail, setLoadingEmail] = useState(false)
  const [loadingGithub, setLoadingGithub] = useState(false)
  const [error, setError] = useState("")

  // Theme toggle (persisted)
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    if (typeof window === "undefined") return "dark"
    return (localStorage.getItem("theme") as "light" | "dark") || "dark"
  })
  useEffect(() => {
    if (typeof document === "undefined") return
    document.documentElement.classList.toggle("dark", theme === "dark")
    localStorage.setItem("theme", theme)
  }, [theme])

  // Password strength (simple heuristics)
  const pwdScore = useMemo(() => {
    let score = 0
    if (password.length >= 8) score++
    if (/[A-Z]/.test(password)) score++
    if (/[a-z]/.test(password)) score++
    if (/\d/.test(password)) score++
    if (/[^A-Za-z0-9]/.test(password)) score++
    return Math.min(score, 5)
  }, [password])

  const pwdLabel = ["Muy débil", "Débil", "Aceptable", "Fuerte", "Muy fuerte"][Math.max(0, pwdScore - 1)] || "—"
  const pwdColor =
    pwdScore <= 1
      ? "bg-rose-500"
      : pwdScore === 2
      ? "bg-amber-500"
      : pwdScore === 3
      ? "bg-yellow-400"
      : pwdScore === 4
      ? "bg-emerald-500"
      : "bg-teal-500"

  const createOrMergeUserDoc = async (uid: string, payload: any) => {
    const ref = doc(db, "users", uid)
    const snap = await getDoc(ref)
    if (snap.exists()) {
      await setDoc(ref, payload, { merge: true })
    } else {
      await setDoc(ref, payload, { merge: true })
    }
  }

  const startSession = async (token: string) => {
    // Crea sesión de app en tu API (igual que el login)
    await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    }).then(async (r) => {
      if (!r.ok) {
        const e = await r.json().catch(() => ({ message: "Error creando sesión" }))
        throw new Error(e.message || "Error creando sesión")
      }
    })
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    if (loadingEmail || loadingGithub) return

    // Validaciones rápidas
    if (!displayName.trim()) {
      setError("Ingresa tu nombre.")
      return
    }
    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden.")
      return
    }
    if (pwdScore < 3) {
      setError("Mejora la contraseña (al menos 8 caracteres y combina mayúsculas, números y símbolos).")
      return
    }

    setError("")
    setLoadingEmail(true)
    const toastId = toast.loading("Creando cuenta...")

    try {
      // 1) Crear usuario en Firebase
      const userCredential = await createUserWithEmailAndPassword(auth, email, password)
      const user = userCredential.user

      // 2) Crear/mezclar documento de usuario
      await createOrMergeUserDoc(user.uid, {
        uid: user.uid,
        email: user.email,
        displayName,
        preferences: {
          theme: "dark",
          colorPalette: "default",
        },
        createdAt: new Date(),
      })

      // 3) Crear sesión en tu API para entrar directo
      const token = await user.getIdToken()
      await startSession(token)

      toast.success("¡Registro exitoso! Configurando tu espacio...", { id: toastId })
      router.replace("/onboarding")
    } catch (err) {
      console.error("Register error:", err)
      let message = "Fallo en el registro. Por favor, inténtalo de nuevo."
      if (err instanceof Error) {
        if (err.message.includes("auth/email-already-in-use")) {
          message = "Este correo electrónico ya está en uso."
        } else if (err.message.includes("auth/weak-password")) {
          message = "La contraseña debe tener al menos 6 caracteres."
        } else {
          message = err.message
        }
      }
      setError(message)
      toast.error(message, { id: toastId })
    } finally {
      setLoadingEmail(false)
    }
  }

  const handleGithubRegister = async () => {
    if (loadingEmail || loadingGithub) return
    setError("")
    setLoadingGithub(true)
    const toastId = toast.loading("Conectando con GitHub...")

    try {
      const provider = new GithubAuthProvider()
      const result = await signInWithPopup(auth, provider)
      const user = result.user

      await createOrMergeUserDoc(user.uid, {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName || displayName || "",
        preferences: { theme: "dark", colorPalette: "default" },
        createdAt: new Date(),
      })

      const token = await user.getIdToken()
      await startSession(token)

      toast.success("¡Cuenta creada con GitHub!", { id: toastId })
      router.replace("/onboarding")
    } catch (err) {
      console.error("GitHub register error:", err)
      const message = err instanceof Error ? err.message : "No se pudo completar el registro con GitHub."
      setError(message)
      toast.error(message, { id: toastId })
    } finally {
      setLoadingGithub(false)
    }
  }

  return (
    <div className="relative w-full min-h-screen bg-background text-foreground overflow-hidden">
      {/* Toggle de tema */}
      <div className="fixed right-4 top-4 z-40">
        <Button
          variant="ghost"
          size="icon"
          aria-label={theme === "dark" ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
          onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
          className="rounded-full border border-border/60 hover:bg-muted"
        >
          {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </Button>
      </div>

      {/* Panel derecho con branding y gradiente animado (sin marcos) */}
      <div className="pointer-events-none fixed inset-y-0 right-0 hidden lg:block w-[50vw]">
        <div className="absolute inset-0 animated-gradient opacity-95" />
        <div className="absolute -top-24 right-10 h-72 w-72 rounded-full bg-fuchsia-400/30 blur-3xl animate-blob" />
        <div className="absolute bottom-10 -left-12 h-72 w-72 rounded-full bg-cyan-400/30 blur-3xl animate-blob animation-delay-2000" />
        <div className="absolute top-1/2 -translate-y-1/2 left-8 h-56 w-56 rounded-full bg-indigo-400/25 blur-3xl animate-blob animation-delay-4000" />

        <div className="relative z-10 h-full flex flex-col items-center justify-center text-center px-8">
          <div className="mb-6 inline-flex items-center gap-4 animate-float">
            <div className="h-14 w-14 rounded-2xl bg-white/15 dark:bg-black/20 backdrop-blur inline-flex items-center justify-center shadow-[0_0_30px_-10px_rgba(255,255,255,0.5)]">
              <Workflow className="h-8 w-8 text-white drop-shadow" />
            </div>
            <h1 className="text-5xl font-extrabold tracking-tight bg-clip-text text-transparent bg-[linear-gradient(90deg,#60A5FA,#8B5CF6,#22D3EE,#FB7185)] bg-[length:220%_100%] animate-gradientText">
              QuantifyFlow
            </h1>
          </div>
          <p className="text-lg max-w-xl text-white/90">
            Crea tu cuenta y empieza a organizar, colaborar y ejecutar con precisión.
          </p>
          <p className="mt-4 text-sm text-white/80">Productividad al máximo nivel.</p>
          <div className="absolute bottom-6 text-xs text-white/70">© {new Date().getFullYear()} QuantifyFlow Inc.</div>
        </div>
      </div>

      {/* Columna izquierda: formulario sin marcos, fijo y centrado */}
      <div className="lg:fixed lg:inset-y-0 lg:left-0 lg:w-[50vw] flex items-center justify-center px-6 sm:px-10 py-10">
        <div className="absolute inset-0 lg:inset-y-0 lg:left-0 lg:w-[50vw] pointer-events-none">
          <div className="absolute left-[-10%] top-[-10%] h-64 w-64 rounded-full bg-violet-500/10 blur-3xl animate-blob" />
        </div>

        <div className="relative z-10 w-full max-w-md space-y-8 animate-in-up">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-3">
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-primary shadow-[0_0_0_1px_rgba(255,255,255,0.05)]">
                <Workflow className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-3xl font-bold tracking-tight">Crea tu cuenta</h2>
                <p className="text-muted-foreground">Únete para gestionar tus proyectos con un flujo imparable.</p>
              </div>
            </div>
          </div>

          <form onSubmit={handleRegister} className="space-y-5" noValidate>
            {/* Nombre */}
            <div className="space-y-2">
              <label htmlFor="displayName" className="text-sm font-medium">
                Nombre completo
              </label>
              <div className="relative group">
                <User className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="displayName"
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Tu nombre"
                  required
                  className="pl-9 h-11 rounded-2xl bg-background/60 focus-visible:ring-2 focus-visible:ring-violet-400/70"
                />
                <div className="pointer-events-none absolute -inset-px rounded-2xl opacity-0 group-focus-within:opacity-100 transition-opacity bg-[conic-gradient(from_180deg_at_50%_50%,rgba(124,58,237,0.35),rgba(34,211,238,0.35),rgba(251,113,133,0.35),rgba(124,58,237,0.35))]" />
              </div>
            </div>

            {/* Email */}
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium">
                Correo electrónico
              </label>
              <div className="relative group">
                <Mail className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nombre@quantify.net.pe"
                  required
                  className="pl-9 h-11 rounded-2xl bg-background/60 focus-visible:ring-2 focus-visible:ring-violet-400/70"
                />
                <div className="pointer-events-none absolute -inset-px rounded-2xl opacity-0 group-focus-within:opacity-100 transition-opacity bg-[conic-gradient(from_180deg_at_50%_50%,rgba(124,58,237,0.35),rgba(34,211,238,0.35),rgba(251,113,133,0.35),rgba(124,58,237,0.35))]" />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium">
                Contraseña
              </label>
              <div className="relative group">
                <Lock className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 8 caracteres"
                  required
                  className="pl-9 pr-10 h-11 rounded-2xl bg-background/60 focus-visible:ring-2 focus-visible:ring-violet-400/70"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
                <div className="pointer-events-none absolute -inset-px rounded-2xl opacity-0 group-focus-within:opacity-100 transition-opacity bg-[conic-gradient(from_180deg_at_50%_50%,rgba(124,58,237,0.35),rgba(34,211,238,0.35),rgba(251,113,133,0.35),rgba(124,58,237,0.35))]" />
              </div>

              {/* Barra de fuerza */}
              <div className="mt-2 space-y-1">
                <div className="h-1.5 w-full rounded-full bg-muted/60 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${pwdColor}`}
                    style={{ width: `${(pwdScore / 5) * 100}%` }}
                  />
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  {pwdScore >= 3 ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> : <Circle className="h-3.5 w-3.5 text-rose-500" />}
                  <span>Seguridad: {pwdLabel}</span>
                </div>
              </div>
            </div>

            {/* Confirm Password */}
            <div className="space-y-2">
              <label htmlFor="confirmPassword" className="text-sm font-medium">
                Confirmar contraseña
              </label>
              <div className="relative group">
                <Lock className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repite la contraseña"
                  required
                  className="pl-9 pr-10 h-11 rounded-2xl bg-background/60 focus-visible:ring-2 focus-visible:ring-violet-400/70"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label={showConfirmPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
                <div className="pointer-events-none absolute -inset-px rounded-2xl opacity-0 group-focus-within:opacity-100 transition-opacity bg-[conic-gradient(from_180deg_at_50%_50%,rgba(124,58,237,0.35),rgba(34,211,238,0.35),rgba(251,113,133,0.35),rgba(124,58,237,0.35))]" />
              </div>
            </div>

            {error && (
              <p className="text-sm text-destructive font-medium text-center">{error}</p>
            )}

            {/* Botón primario con shimmer */}
            <Button
              type="submit"
              className="relative w-full h-11 rounded-2xl font-semibold shadow-md bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500 hover:from-indigo-400 hover:via-violet-500 hover:to-fuchsia-400 transition-all active:scale-[0.99] focus-visible:shadow-[0_0_0_3px_rgba(139,92,246,0.35)] overflow-hidden"
              disabled={loadingEmail || loadingGithub}
            >
              <span className="absolute inset-0 -translate-x-full bg-[linear-gradient(110deg,transparent,rgba(255,255,255,0.35),transparent)] animate-shimmer" />
              <span className="relative">
                {loadingEmail ? (
                  <span className="inline-flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V1C5.373 1 1 5.373 1 12h3z" />
                    </svg>
                    Creando cuenta...
                  </span>
                ) : (
                  "Crear cuenta"
                )}
              </span>
            </Button>
          </form>

          

        

          <p className="text-sm text-center text-muted-foreground">
            ¿Ya tienes una cuenta?{" "}
            <Link href="/login" className="font-semibold text-primary hover:underline underline-offset-4">
              Inicia sesión
            </Link>
          </p>
        </div>
      </div>

      {/* En móviles, refuerzo visual sutil */}
      <div className="lg:hidden pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-fuchsia-500/10 to-transparent" />

      {/* Animaciones y utilidades */}
      <style jsx global>{`
        .animated-gradient {
          background: radial-gradient(1200px 600px at 80% 20%, rgba(96, 165, 250, 0.25), transparent 60%),
            radial-gradient(800px 500px at 10% 80%, rgba(34, 211, 238, 0.2), transparent 60%),
            linear-gradient(120deg, #5b8cff, #7c3aed 40%, #22d3ee 70%, #ff6ac1);
          background-size: 180% 180%;
          animation: gradientMove 12s ease-in-out infinite;
          filter: saturate(1.1);
        }
        @keyframes gradientMove {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        @keyframes shimmer {
          100% { transform: translateX(100%); }
        }
        .animate-shimmer { animation: shimmer 2s infinite; }
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
        .animate-float { animation: float 6s ease-in-out infinite; }
        @keyframes blob {
          0%, 100% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(30px, -20px) scale(1.05); }
          66% { transform: translate(-20px, 20px) scale(0.95); }
        }
        .animate-blob { animation: blob 12s ease-in-out infinite; }
        .animation-delay-2000 { animation-delay: 2s; }
        .animation-delay-4000 { animation-delay: 4s; }
        @keyframes inUp {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-in-up { animation: inUp 500ms ease-out both; }
        @keyframes gradientText {
          0%,100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        .animate-gradientText { animation: gradientText 10s ease-in-out infinite; }
      `}</style>
    </div>
  )
}