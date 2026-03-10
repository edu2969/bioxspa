import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './node_modules/flowbite/**/*.js',
    './node_modules/react-tailwindcss-datepicker/dist/index.esm.js',
  ],
  theme: {
    extend: {
      keyframes: {
        entrance: {
          '0%': { filter: 'opacity(0)', transform: "scale(0.1)" },
          '100%': { filter: 'opacity(1)', transform: "scale(1.5)" },
        },
        spin: {
          'from': { transform: "rotate(0deg)" },
          'to': { transform: "rotate(360deg)" },
        },
        slideOut: {
          '0%': { transform: 'translateX(0)', filter: "opacity(1)" },
          '100%': { transform: 'translateX(-100%)', filter: 'opacity(0)' }
        }
      }
    },
    animation: {
      'entrance': 'entrance 2s forwards',
      'spin': 'spin 1s linear infinite',
      'animate-slide-out': 'slideOut 1s forwardss'    
    }
  },
  plugins: [],
}
export default config
