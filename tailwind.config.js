/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eefdf3',
          100: '#d6fae3',
          200: '#b0f3cb',
          300: '#7ce8ac',
          400: '#42d488',
          500: '#1abc6e',
          600: '#10995a',
          700: '#107a4a',
          800: '#11603d',
          900: '#0f4f34',
        },
        accent: '#ff9f43',
        surface: '#f4f6f8',
      },
      fontFamily: {
        sans: ['System'],
      },
    },
  },
  plugins: [],
};
