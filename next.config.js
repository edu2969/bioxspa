/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    // Ignorar errores de TypeScript durante build (solo para desarrollo)
    ignoreBuildErrors: false,
  },
  experimental: {
    typedRoutes: false, // Deshabilitar rutas tipadas si causan problemas
  },
}

const isProd = process.env.NODE_ENV === 'production';

const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: !isProd, // 👈 desactiva en desarrollo
});

module.exports = withPWA({
  output: 'standalone',
});