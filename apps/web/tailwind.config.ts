import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        gold: {
          DEFAULT: '#C5A15A',
          light: '#E6D5A8',
          dark: '#A4823D',
        },
        ivory: '#F8F7F4',
        ink: '#202020',
        muted: '#777777',
        sand: '#EAE6DD',
      },
      fontFamily: {
        serif: ['Playfair Display', 'Georgia', 'serif'],
        display: ['Cinzel Decorative', 'Playfair Display', 'serif'],
        sans: ['Plus Jakarta Sans', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;
