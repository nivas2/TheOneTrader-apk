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
          dark: '#0A0A0F',
          'dark-card': '#111118',
          'dark-border': '#1E1E2A',
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
      animation: {
        'fade-in-up': 'fadeInUp 0.6s ease-out forwards',
        'float': 'float 6s ease-in-out infinite',
        'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
        'toast-in': 'toastSlideIn 0.5s ease-out forwards',
        'toast-out': 'toastSlideOut 0.5s ease-in forwards',
        'particle': 'particleDrift 20s linear infinite',
        'shimmer': 'shimmer 2s linear infinite',
        'live-dot': 'liveDot 1.5s ease-in-out infinite',
        'text-glow': 'textGlow 2s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};

export default config;
