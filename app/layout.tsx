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
  title: "Project Management",
  description: "Multi-team project management application",
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
      <body className={`font-sans antialiased`}>
        <NextThemesProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
        >
          {/* 👇 Renderizamos 'children' directamente para aislar el problema */}
          <AuthProvider><ProvidersContainer>{children}</ProvidersContainer></AuthProvider>
          

          {/* // --- CÓDIGO COMENTADO PARA DEPURACIÓN ---
          <AuthProvider>
            <ProvidersContainer>
              {children}
            </ProvidersContainer>
          </AuthProvider>
          */}
        </NextThemesProvider>
        
        <Analytics />
      </body>
    </html>
  )
}