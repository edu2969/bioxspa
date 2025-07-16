const withPWA = require('next-pwa')({
    dest: 'public',
    register: true,
    skipWaiting: true
});

module.exports = withPWA({
    // Aquí van otras opciones de Next.js si las tienes
});