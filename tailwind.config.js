/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      // Retro cabin palette: earth tones, brick, fireplace ember and flame.
      // Theme palette: each colour is a CSS variable set per theme (see src/index.css).
      colors: {
        ink: 'rgb(var(--c-ink) / <alpha-value>)',
        wood: {
          950: 'rgb(var(--c-wood-950) / <alpha-value>)',
          900: 'rgb(var(--c-wood-900) / <alpha-value>)',
          800: 'rgb(var(--c-wood-800) / <alpha-value>)',
          700: 'rgb(var(--c-wood-700) / <alpha-value>)',
          600: 'rgb(var(--c-wood-600) / <alpha-value>)',
          500: 'rgb(var(--c-wood-500) / <alpha-value>)',
          400: 'rgb(var(--c-wood-400) / <alpha-value>)',
        },
        parchment: {
          50: 'rgb(var(--c-parchment-50) / <alpha-value>)',
          100: 'rgb(var(--c-parchment-100) / <alpha-value>)',
          200: 'rgb(var(--c-parchment-200) / <alpha-value>)',
          300: 'rgb(var(--c-parchment-300) / <alpha-value>)',
          400: 'rgb(var(--c-parchment-400) / <alpha-value>)',
          500: 'rgb(var(--c-parchment-500) / <alpha-value>)',
        },
        brick: {
          700: 'rgb(var(--c-brick-700) / <alpha-value>)',
          600: 'rgb(var(--c-brick-600) / <alpha-value>)',
          500: 'rgb(var(--c-brick-500) / <alpha-value>)',
          400: 'rgb(var(--c-brick-400) / <alpha-value>)',
        },
        ember: {
          700: 'rgb(var(--c-ember-700) / <alpha-value>)',
          600: 'rgb(var(--c-ember-600) / <alpha-value>)',
          500: 'rgb(var(--c-ember-500) / <alpha-value>)',
          400: 'rgb(var(--c-ember-400) / <alpha-value>)',
          300: 'rgb(var(--c-ember-300) / <alpha-value>)',
        },
        flame: {
          400: 'rgb(var(--c-flame-400) / <alpha-value>)',
          300: 'rgb(var(--c-flame-300) / <alpha-value>)',
          200: 'rgb(var(--c-flame-200) / <alpha-value>)',
        },
        moss: {
          700: 'rgb(var(--c-moss-700) / <alpha-value>)',
          600: 'rgb(var(--c-moss-600) / <alpha-value>)',
          500: 'rgb(var(--c-moss-500) / <alpha-value>)',
          400: 'rgb(var(--c-moss-400) / <alpha-value>)',
          300: 'rgb(var(--c-moss-300) / <alpha-value>)',
          200: 'rgb(var(--c-moss-200) / <alpha-value>)',
          100: 'rgb(var(--c-moss-100) / <alpha-value>)',
        },
        plum: {
          600: 'rgb(var(--c-plum-600) / <alpha-value>)',
          500: 'rgb(var(--c-plum-500) / <alpha-value>)',
          300: 'rgb(var(--c-plum-300) / <alpha-value>)',
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
