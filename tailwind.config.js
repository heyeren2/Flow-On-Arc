/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          blue: '#3B82F6', // Primary blue
          orange: '#F97316', // Orange accent
          purple: '#8B5CF6', // Purple accent
        },
        light: {
          bg: '#F5F5F5', // Light grey background
          card: '#FFFFFF', // White cards
          border: '#E5E7EB', // Light border
        },
        dark: {
          text: '#1F2937', // Dark grey text
          secondary: '#6B7280', // Secondary text
        },
      },
    },
  },
  plugins: [],
}

