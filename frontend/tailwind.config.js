/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          50: '#e8edf3',
          100: '#c5d0e0',
          200: '#9fb2cc',
          300: '#7994b8',
          400: '#5c7ea8',
          500: '#3f6899',
          600: '#365d8a',
          700: '#2c4f76',
          800: '#234163',
          900: '#1a3a5c',
          950: '#0f2440',
        },
        ghmc: {
          primary: '#1a3a5c',
          secondary: '#2c5f8a',
          accent: '#e8941a',
          light: '#f0f4f8',
          success: '#059669',
          danger: '#dc2626',
          warning: '#d97706',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        'card': '0 1px 3px 0 rgba(26, 58, 92, 0.1), 0 1px 2px -1px rgba(26, 58, 92, 0.06)',
        'card-hover': '0 4px 6px -1px rgba(26, 58, 92, 0.12), 0 2px 4px -2px rgba(26, 58, 92, 0.08)',
        'elevated': '0 10px 25px -5px rgba(26, 58, 92, 0.15), 0 4px 10px -6px rgba(26, 58, 92, 0.1)',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideDown: {
          '0%': { opacity: '0', transform: 'translateY(-10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
};
