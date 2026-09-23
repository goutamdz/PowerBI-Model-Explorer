import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        surface: '#0b0f19',
        panel: '#141926',
        panelHover: '#1c2235',
        border: '#232a3b',
        accent: '#6366f1',
        accentMuted: '#4f46e5',
        glow: '#818cf8',
        fact: '#f97316',
        dimension: '#38bdf8',
        inactive: '#64748b',
        success: '#34d399',
        danger: '#f43f5e',
      },
      boxShadow: {
        glow: '0 0 40px rgba(99,102,241,0.15)',
        popup: '0 25px 60px rgba(0,0,0,0.55)',
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'sans-serif'],
        body: ['"Inter"', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'monospace'],
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-out',
        'slide-up': 'slideUp 0.25s ease-out',
      },
      keyframes: {
        fadeIn: { from: { opacity: '0' }, to: { opacity: '1' } },
        slideUp: { from: { opacity: '0', transform: 'translateY(12px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
      },
    },
  },
  plugins: [],
} satisfies Config;
