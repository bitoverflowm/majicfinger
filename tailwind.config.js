/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
 
    // Or if using `src` directory:
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    fontFamily: {
      'title': ['Bodoni Moda', 'serif'],
      'body': ['Open Sans', 'sans-serif']
    },
    extend: {
      width: {
        '88': '22rem'
      },
      fontSize: {
        'xxs': '0.600rem',
      },
      aspectRatio: {
        '9/16': '56.25%',
      },
      colors: {
        'majic-grey': "#7D8491",
        'majic-white': "#FBFBFF",
        'majic-blue': '#A5D8FF',
        'majic-accent': '#802392',
        'lychee-black': '#121619',
        'lychee-red': '#BA0B31',
        'lychee-green': '#86efac',
        'lychee-white': '#F4EDEA',
        'lychee-peach': '#7F7EFF',//'#0081AF',
      },
      keyframes: {
        shiver: {
          '0%, 100%': { transform: 'rotate(-1deg) translateX(0.25%) translateY(0.25%)' },
          '50%': { transform: 'rotate(1deg) translateX(-0.25%) translateY(-0.25%)' },
        },
        border: {
          '0%': { backgroundPosition: '10% 0%' },
          '50%': { backgroundPosition: '91% 100%' },
          '100%': { backgroundPosition: '10% 0%' }
        },
        background: {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
      },
      animation: {
        shiver: 'shiver 0.25s linear infinite',
        border: 'border 2s ease-in-out infinite',
        background: 'background 2s ease-in-out infinite',
      },
    },
  },
  plugins: [
    require('@tailwindcss/aspect-ratio'),
  ],
}