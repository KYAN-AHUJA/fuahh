/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        arena: {
          bg: '#0B0E0D',
          surface: '#121715',
          panel: '#171D1A',
          text: '#EAE7DE',
          muted: '#A6AAA2',
          border: '#303833',
          p1: '#168BFF',
          p2: '#E65361',
          success: '#65B987',
          warm: '#D9CCB2',
          'warm-text': '#171916',
        },
        player1: {
          DEFAULT: '#168BFF',
          dark: '#0d5bb0',
        },
        player2: {
          DEFAULT: '#E65361',
          dark: '#b0333f',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      }
    },
  },
  plugins: [],
}
