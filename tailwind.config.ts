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
      },
      colors: {
        'ship-cove': {
          '50': '#f3f6fb',
          '100': '#e5e9f4',
          '200': '#d0d9ed',
          '300': '#b0c0e0',
          '400': '#8a9fd0',
          '500': '#6a7fc1',
          '600': '#5b6bb5',
          '700': '#505aa5',
          '800': '#464c87',
          '900': '#3c416c',
          '950': '#282a43',
        },
        'persian-red': {
          '50': '#fdf3f3',
          '100': '#fde3e3',
          '200': '#fccccc',
          '300': '#f8a9a9',
          '400': '#f27777',
          '500': '#e74c4c',
          '600': '#c72929',
          '700': '#b22323',
          '800': '#932121',
          '900': '#7b2121',
          '950': '#420d0d',
        },
        'old-gold': {
          '50': '#fbfbeb',
          '100': '#f3f5cc',
          '200': '#edec9b',
          '300': '#e2dc62',
          '400': '#d8ca37',
          '500': '#c7b229',
          '600': '#ad8f21',
          '700': '#8a6a1e',
          '800': '#735520',
          '900': '#634720',
          '950': '#39260f',
        },
      },
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
