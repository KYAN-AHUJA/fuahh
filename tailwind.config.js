/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        charcoal: {
          950: '#0a0d12',
          900: '#0f141c',
          850: '#141a24',
          800: '#1a2230',
          700: '#263346',
          600: '#38485e',
        },
        player1: {
          DEFAULT: '#168BFF',
          glow: 'rgba(22, 139, 255, 0.4)',
          dark: '#0d5bb0',
        },
        player2: {
          DEFAULT: '#E65361',
          glow: 'rgba(230, 83, 97, 0.4)',
          dark: '#b0333f',
        },
        accent: {
          gold: '#f59e0b',
          cyan: '#06b6d4',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      }
    },
  },
  plugins: [],
}
