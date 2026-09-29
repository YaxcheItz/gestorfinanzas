/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    "./src/**/*.{html,ts}"
  ],
  theme: {
    extend: {
      colors: {
        kaptal: {
          canvas: 'var(--kaptal-canvas)',
          surface: 'var(--kaptal-surface)',
          subtle: 'var(--kaptal-surface-subtle)',
          text: 'var(--kaptal-content)',
          muted: 'var(--kaptal-content-muted)',
          border: 'var(--kaptal-border)',
          brand: 'var(--kaptal-brand)',
          focus: 'var(--kaptal-focus)'
        },
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

