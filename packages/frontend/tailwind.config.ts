import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#FFF8F2',
          100: '#FFE9D5',
          200: '#FFCFA5',
          300: '#FFB070',
          400: '#F2954E',
          500: '#E8854A',
          600: '#D06E35',
          700: '#A85525',
          800: '#7A3A15',
          900: '#5C2A08',
        },
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'sans-serif'],
      },
    },
  },
  plugins: [],
} satisfies Config
