import type React from "react"
import type { Metadata } from "next"
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"
import { Analytics } from "@vercel/analytics/next"
import { ThemeProvider } from "@/lib/theme-context"
import "./globals.css"
import { AuthProvider } from "@/context/AuthContext";


export const metadata: Metadata = {
  title: "Project Management",
  description: "Multi-team project management application",
  generator: "v0.app",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    // Aplica las variables de fuente aquí
    <html
      lang="en"
      suppressHydrationWarning
      className={`${GeistSans.variable} ${GeistMono.variable}`}
    >
      <body className={`font-sans antialiased`}>
        <AuthProvider><ThemeProvider>{children}</ThemeProvider></AuthProvider>
        <Analytics />
      </body>
    </html>
  )
}
