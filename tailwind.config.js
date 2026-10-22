/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        serif: ['"Source Serif 4"', 'Georgia', 'serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      colors: {
        navy: {
          50: '#f0f4f8',
          100: '#d9e2ec',
          200: '#bcccdc',
          300: '#9aaec5',
          400: '#6989b3',
          500: '#47689a',
          600: '#34517f',
          700: '#243c63',
          800: '#1a2d4e',
          900: '#0f1f38',
          950: '#0a1628',
        },
        gold: {
          50: '#faf7f2',
          100: '#f0e8d9',
          200: '#e0d0b5',
          300: '#cdb289',
          400: '#b8956a',
          500: '#a37e52',
          600: '#8a6743',
          700: '#6f5136',
          800: '#5a422e',
          900: '#493727',
        },
        ink: {
          50: '#f7f7f8',
          100: '#eeeef0',
          200: '#dcdce0',
          300: '#c0c0c8',
          400: '#9a9aa5',
          500: '#76767f',
          600: '#5a5a63',
          700: '#46464d',
          800: '#2e2e34',
          900: '#1a1a1f',
        },
        accent: {
          50: '#effaf5',
          100: '#d7f1e4',
          200: '#b1e3cb',
          300: '#80cdaa',
          400: '#4ab487',
          500: '#2a9a6c',
          600: '#1c7d56',
          700: '#186346',
          800: '#154f39',
          900: '#11412f',
        },
      },
      spacing: {
        '18': '4.5rem',
      },
      animation: {
        'fade-in': 'fadeIn 0.4s ease-out',
        'fade-in-up': 'fadeInUp 0.5s ease-out',
        'slide-in-right': 'slideInRight 0.3s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
        'pulse-soft': 'pulseSoft 2s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideInRight: {
          '0%': { opacity: '0', transform: 'translateX(20px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.6' },
        },
      },
    },
  },
  plugins: [],
};
