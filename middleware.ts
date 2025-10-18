import { type NextRequest, NextResponse } from "next/server"

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const token = request.cookies.get("__session")?.value

  // NUEVO: Redirige desde la raíz a la página correcta
  if (pathname === "/") {
    return NextResponse.redirect(new URL(token ? "/dashboard" : "/login", request.url))
  }

  // Protege las rutas privadas
  if ((pathname.startsWith("/dashboard") || pathname.startsWith("/projects") || pathname.startsWith("/team")) && !token) {
    return NextResponse.redirect(new URL("/login", request.url))
  }

  // Si el usuario está logueado, no puede ver login/register
  if ((pathname === "/login" || pathname === "/register") && token) {
    return NextResponse.redirect(new URL("/dashboard", request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}