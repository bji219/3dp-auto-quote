import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // IDW3D Light Cream Theme
        primary: {
          50: '#F5F3ED',
          100: '#E7E1D5', // Main cream background
          200: '#DCD6CA', // Secondary light
          300: '#C5BFAE', // Border color
          400: '#A69F8E',
          500: '#8A8070',
          600: '#0C2030', // Deep blue (main action color)
          700: '#0b2030', // Card backgrounds
          800: '#091828',
          900: '#060F1A',
        },
        accent: {
          amber: '#B85C38', // Rust/amber
          cyan: '#0C2030', // Deep blue
        },
        cream: {
          light: '#E7E1D5',
          dark: '#DCD6CA',
        },
      },
      fontFamily: {
        mono: ['var(--font-dm-mono)', 'DM Mono', 'monospace'],
        heading: ['var(--font-syne)', 'Syne', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;
