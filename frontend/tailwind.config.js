/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    "./src/**/*.{html,ts}"
  ],
  theme: {
    extend: {
      colors: {
        finance: {
          income: '#10b981',
          expense: '#f43f5e',
          balance: '#3b82f6',
          saving: '#8b5cf6'
        }
      }
    },
  },
  plugins: [],
}

