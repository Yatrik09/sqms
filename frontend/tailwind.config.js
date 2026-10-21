/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'gallery-white': '#ffffff',
        'studio-mist': '#f5f5f7',
        'paper-frost': '#fafafc',
        'hairline-silver': '#d6d6d6',
        'control-gray': '#e6e6e8',
        ink: '#1d1d1f',
        slate: '#707070',
        steel: '#86868b',
        'apple-blue': '#0066cc',
        'pricing-blue': '#0071e3',
        'launch-orange': '#b64400',
        navy: {
          50: '#f0f4f8',
          100: '#d9e2ec',
          200: '#bcccdc',
          300: '#9fb3c8',
          400: '#829ab1',
          500: '#627d98',
          600: '#486581',
          700: '#334e68',
          800: '#243b53',
          900: '#102a43',
          950: '#0b1d30',
        },
        brand: {
          blue: '#0071e3',
          sky: '#0066cc',
          amber: '#b64400',
          emerald: '#059669',
          crimson: '#dc2626',
        }
      },
      borderRadius: {
        cards: '28px',
        pills: '36px',
        navigation: '20px',
        buttons: '9999px',
        inputs: '980px',
      },
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          '"SF Pro Text"',
          '"SF Pro Display"',
          '"Helvetica Neue"',
          'Inter',
          'Arial',
          'sans-serif'
        ],
        display: [
          '"SF Pro Display"',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Helvetica Neue"',
          'sans-serif'
        ]
      }
    },
  },
  plugins: [],
}
