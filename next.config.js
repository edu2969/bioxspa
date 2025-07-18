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