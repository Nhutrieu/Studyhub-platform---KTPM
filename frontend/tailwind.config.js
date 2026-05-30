/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'],
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '128': '32rem',
      },
      transitionDuration: {
        '250': '250ms',
      },
      // Note: Colors and Shadows are now managed via CSS variables in globals.css
      // using the Tailwind v4 @theme directive methodology for better dynamic control.
      colors: {
        yellow: {
          400: '#FACC15',
          500: '#EAB308',
          600: '#CA8A04',
        },
      },
    },
  },
  plugins: [],
};
