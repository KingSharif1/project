/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        premium: {
          // Minimalist Palette (Zinc/Slate based)
          dark: '#09090b', // zinc-950
          card: 'rgba(255, 255, 255, 0.03)',
          border: 'rgba(255, 255, 255, 0.08)',
          accent: {
            white: '#fafafa', // zinc-50
            slate: '#94a3b8', // slate-400
            glass: 'rgba(255, 255, 255, 0.1)',
          }
        }
      },
      animation: {
        'blob': 'blob 20s infinite alternate', // Much slower
        'fade-in': 'fade-in 1s ease-out',
        'fade-in-up': 'fade-in-up 1s ease-out backwards',
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        blob: {
          '0%': { transform: 'translate(0px, 0px) scale(1)', opacity: '0.4' },
          '33%': { transform: 'translate(20px, -30px) scale(1.05)', opacity: '0.5' },
          '66%': { transform: 'translate(-10px, 10px) scale(0.95)', opacity: '0.4' },
          '100%': { transform: 'translate(0px, 0px) scale(1)', opacity: '0.4' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'fade-in-up': {
          '0%': { opacity: '0', transform: 'translateY(15px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        }
      }
    },
  },
  plugins: [],
};
