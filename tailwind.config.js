/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './src/**/*.{ts,tsx}',
    './*.html',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        slate: {
          950: '#020617',
        },
      },
      fontFamily: {
        sans: ['DM Sans', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      animation: {
        'slide-in': 'slideIn 0.25s ease-out',
        'fade-in': 'fadeIn 0.2s ease-out',
        'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
      },
      keyframes: {
        slideIn: {
          '0%': { transform: 'translateX(100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 8px rgba(6,182,212,0.3)' },
          '50%': { boxShadow: '0 0 20px rgba(6,182,212,0.6)' },
        },
      },
    },
  },
  plugins: [],
};
