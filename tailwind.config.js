/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        cream: '#FAFAF9',
        rose: {
          soft: '#FEE2E2',
        },
        amber: {
          warm: '#FEF3C7',
        },
        sage: {
          soft: '#DCFCE7',
        },
      },
      fontFamily: {
        display: ['Fraunces', 'Georgia', 'serif'],
        sans: ['Nunito', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        cozy: '0 10px 40px -12px rgba(120, 53, 15, 0.18)',
      },
    },
  },
  plugins: [],
};
