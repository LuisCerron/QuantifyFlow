import type React from "react"
import type { Metadata } from "next"
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"
import { Analytics } from "@vercel/analytics/next"
import { ThemeProvider as NextThemesProvider } from "next-themes"

import "./globals.css"
import { AuthProvider } from "@/context/AuthContext"
import { ProvidersContainer } from "@/components/ProvidersContainer"

export const metadata: Metadata = {
  title: "QuantifyFlow",
  description: "Aplicación de gestión de proyectos para múltiples equipos",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${GeistSans.variable} ${GeistMono.variable}`}
    >
      <head>
        {/* Favicon personalizado */}
        <link rel="icon" type="image/jpeg" href="/icon-quantify.jpg" />
        {/* Puedes agregar otras opciones si quieres mayor compatibilidad */}
        {/* <link rel="icon" href="/favicon.ico" sizes="any" /> */}
        {/* <link rel="manifest" href="/site.webmanifest" /> */}
      </head>
      <body className={`font-sans antialiased`}>
        <NextThemesProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
        >
          <AuthProvider>
            <ProvidersContainer>{children}</ProvidersContainer>
          </AuthProvider>
        </NextThemesProvider>
        <Analytics />
      </body>
    </html>
  )
}