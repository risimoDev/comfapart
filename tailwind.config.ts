import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Основная цветовая схема: #00639A, #89B6CD, белый, черный
        primary: {
          50: '#E6F3F9',
          100: '#CCE7F3',
          200: '#99CFE7',
          300: '#66B7DB',
          400: '#339FCF',
          500: '#00639A', // Основной синий
          600: '#00527F',
          700: '#004165',
          800: '#00314C',
          900: '#002133',
          950: '#00111A',
          DEFAULT: '#00639A',
        },
        secondary: {
          50: '#F4F9FC',
          100: '#E9F3F9',
          200: '#D3E7F3',
          300: '#BDDBEC',
          400: '#A3CAE1',
          500: '#89B6CD', // Вторичный голубой
          600: '#6A9BB5',
          700: '#4F819D',
          800: '#3A6785',
          900: '#264D6D',
          950: '#133355',
          DEFAULT: '#89B6CD',
        },
        accent: {
          50: '#E6F3F9',
          100: '#CCE7F3',
          200: '#99CFE7',
          300: '#66B7DB',
          400: '#339FCF',
          500: '#00639A', // Акцент = основной
          600: '#00527F',
          700: '#004165',
          800: '#00314C',
          900: '#002133',
          950: '#00111A',
          DEFAULT: '#00639A',
        },
      },
      fontFamily: {
        sans: ['system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        display: ['Georgia', 'Times New Roman', 'serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out',
        'fade-up': 'fadeUp 0.5s ease-out',
        'slide-in': 'slideIn 0.3s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        shimmer: 'shimmer 2s linear infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideIn: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(0)' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'shimmer-gradient':
          'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.4) 50%, transparent 100%)',
      },
    },
  },
  plugins: [],
}

export default config
