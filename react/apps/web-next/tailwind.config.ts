import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#5B7FFF',
          dark: '#4A67E3',
          light: '#EEF1FF',
        },
        canvas: '#EEF0F5',
      },
      borderRadius: {
        xl2: '1.75rem',
      },
    },
  },
  plugins: [],
};

export default config;
