/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        matcha: {
          50: '#f2fbf4',
          100: '#dff7e4',
          200: '#bfeec9',
          300: '#8ee0a1',
          400: '#58cb73',
          500: '#34b354',
          600: '#269643',
          700: '#207838',
          800: '#1d5f30',
          900: '#194e29',
          950: '#0b2b15',
        },
        cream: {
          50: '#fdfcf8',
          100: '#f8f5ec',
          200: '#f1ebd9',
          300: '#e6dcc0',
        }
      },
    },
  },
  plugins: [],
};
