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
        brand: {
          emerald: '#00B090',
          white: '#FFFFFF',
          gray: '#F8F9FA',
        },
        text: {
          heading: '#1F2937',
          body: '#4B5563',
        },
        signal: {
          red: '#EB5757',
          green: '#00B090',
        },
      },
    },
  },
  plugins: [],
};

export default config;
