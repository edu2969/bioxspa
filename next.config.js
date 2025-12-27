/** @type {import('next').NextConfig} */
const isProd = process.env.NODE_ENV === 'production';

const nextConfig = {
  typescript: {
    // Ignorar errores de TypeScript durante build (solo para desarrollo)
    ignoreBuildErrors: false,
  },  
  typedRoutes: false,
  output: 'standalone',
}

// const withPWA = require('next-pwa')({
//   dest: 'public',
//   register: true,
//   skipWaiting: true,
//   disable: !isProd, // 👈 desactiva en desarrollo
// });

// module.exports = withPWA(nextConfig);
module.exports = nextConfig;