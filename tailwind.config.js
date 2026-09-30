/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      // Retro cabin palette: earth tones, brick, fireplace ember and flame.
      colors: {
        ink: '#2b1a12',
        wood: {
          950: '#1f130c',
          900: '#2b1a12',
          800: '#3d2518',
          700: '#5a3621',
          600: '#7a4a2a',
          500: '#9c6337',
          400: '#b98049',
        },
        parchment: {
          50: '#fff8e7',
          100: '#f7e9c8',
          200: '#ecd6a4',
          300: '#dcbc80',
          400: '#b8955c',
          500: '#8a6a3c',
        },
        brick: {
          700: '#6e2a22',
          600: '#8f3a2c',
          500: '#b04a34',
          400: '#cc6a4a',
        },
        ember: {
          700: '#a44a14',
          600: '#c85f1f',
          500: '#e8772e',
          400: '#f39a3d',
          300: '#f7b76a',
        },
        flame: {
          400: '#f7c548',
          300: '#ffd166',
          200: '#ffe08a',
        },
        moss: {
          700: '#3f5a24',
          600: '#4f7030',
          500: '#638c3c',
          400: '#86b049',
        },
        plum: {
          600: '#5a3566',
          500: '#8a5a9c',
        },
      },
      fontFamily: {
        // Handjet covers Vietnamese; Press Start 2P is Latin-only, so it is reserved for digits and the wordmark.
        sans: ['Handjet', 'system-ui', 'sans-serif'],
        display: ['Handjet', 'system-ui', 'sans-serif'],
        arcade: ['"Press Start 2P"', 'Handjet', 'monospace'],
      },
      // Handjet is condensed, so the type scale runs larger than Tailwind's defaults.
      fontSize: {
        xs: ['15px', '1.15'],
        sm: ['17px', '1.2'],
        base: ['19px', '1.3'],
        lg: ['22px', '1.25'],
        xl: ['25px', '1.2'],
        '2xl': ['30px', '1.1'],
        '3xl': ['36px', '1.05'],
        '4xl': ['44px', '1'],
      },
    },
  },
  plugins: [],
};
