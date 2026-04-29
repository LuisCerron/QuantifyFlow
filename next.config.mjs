/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  output: 'standalone',
  
  // Configuración recomendada para Firebase en Next.js 14
  experimental: {
    // En Next.js 14.2+, esto es para paquetes que deben ser externos en server components
    serverComponentsExternalPackages: ['firebase-admin'],
  },
}

export default nextConfig
