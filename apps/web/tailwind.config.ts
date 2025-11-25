// tailwind.config.ts
import type { Config } from 'tailwindcss';

export default {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        midnight: '#1c1c28',
        lavender: '#e0afff',
        peachy: '#ffdaab',
        cardbg: '#2c2c3a',
      },
      fontFamily: {
        display: ['var(--font-display)', 'sans-serif'],
        body: ['var(--font-body)', 'sans-serif'],
      },
      fontSize: {
        xs: ['12px', { lineHeight: '16px' }],
        sm: ['14px', { lineHeight: '20px' }],
        base: ['16px', { lineHeight: '24px' }],
        lg: ['18px', { lineHeight: '28px' }],
        xl: ['24px', { lineHeight: '32px' }],
        '2xl': ['32px', { lineHeight: '40px' }],
        '3xl': ['48px', { lineHeight: '56px' }],
        '4xl': ['64px', { lineHeight: '72px' }],
      },
      spacing: {
        '1': '4px',    // 0.25rem
        '2': '8px',    // 0.5rem
        '3': '12px',   // 0.75rem
        '4': '16px',   // 1rem
        '6': '24px',   // 1.5rem
        '8': '32px',   // 2rem
        '12': '48px',  // 3rem
        '16': '64px',  // 4rem
      },
      keyframes: {
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        fadeInUp: 'fadeInUp 1s ease forwards',
      },
    },
  },
  plugins: [],
} satisfies Config;
