/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        beige: {
          50: '#FBF9F6',
          100: '#F5F1EA',
          200: '#EAE6DF',
          300: '#EFEBE1',
        },
        terracotta: {
          50: '#FBF1ED',
          100: '#F3DDD2',
          200: '#E7BBA6',
          300: '#D89878',
          400: '#C77A58',
          500: '#9E5B43',
          600: '#8A4E3A',
          700: '#6F3E2E',
          800: '#542F23',
        },
        sage: {
          50: '#F0F5F1',
          100: '#E2EDE6',
          200: '#C9DCCF',
          300: '#A4C4AD',
          400: '#7BA683',
          500: '#547A5F',
          600: '#466A51',
          700: '#3A5742',
        },
        ink: {
          900: '#2C2C2C',
          800: '#3D362F',
          700: '#524940',
          600: '#6B6056',
          500: '#7D7A75',
          400: '#9D988F',
          300: '#B0ACA5',
        },
      },
      fontFamily: {
        serif: ['"Playfair Display"', 'Georgia', 'serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        soft: '0 2px 12px -2px rgba(110, 80, 60, 0.06), 0 1px 3px -1px rgba(110, 80, 60, 0.04)',
        'soft-lg': '0 8px 30px -6px rgba(110, 80, 60, 0.10), 0 2px 8px -2px rgba(110, 80, 60, 0.05)',
        glass: '0 8px 32px -8px rgba(110, 80, 60, 0.12)',
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'hash-pulse': {
          '0%, 100%': { opacity: '0.4' },
          '50%': { opacity: '1' },
        },
        'terminal-blink': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0' },
        },
        'slide-in': {
          '0%': { opacity: '0', transform: 'translateX(-12px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-12px)' },
        },
        'float-slow': {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-20px)' },
        },
        'pulse-ring': {
          '0%': { transform: 'scale(0.8)', opacity: '0.5' },
          '100%': { transform: 'scale(2)', opacity: '0' },
        },
        'gradient-shift': {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
        'count-up': {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'marquee': {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        'page-enter': {
          '0%': { opacity: '0', transform: 'translateY(16px) scale(0.99)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        'page-exit': {
          '0%': { opacity: '1', transform: 'translateY(0) scale(1)' },
          '100%': { opacity: '0', transform: 'translateY(-12px) scale(0.99)' },
        },
        'scale-in': {
          '0%': { opacity: '0', transform: 'scale(0.96)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.5s ease-out',
        'hash-pulse': 'hash-pulse 1.2s ease-in-out infinite',
        'terminal-blink': 'terminal-blink 1s step-end infinite',
        'slide-in': 'slide-in 0.4s ease-out',
        'float': 'float 4s ease-in-out infinite',
        'float-slow': 'float-slow 6s ease-in-out infinite',
        'pulse-ring': 'pulse-ring 2.5s ease-out infinite',
        'gradient-shift': 'gradient-shift 8s ease infinite',
        'count-up': 'count-up 0.6s ease-out',
        'marquee': 'marquee 30s linear infinite',
        'page-enter': 'page-enter 0.45s cubic-bezier(0.22, 1, 0.36, 1)',
        'page-exit': 'page-exit 0.25s ease-in',
        'scale-in': 'scale-in 0.4s cubic-bezier(0.22, 1, 0.36, 1)',
      },
    },
  },
  plugins: [],
};
