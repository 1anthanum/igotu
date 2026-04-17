/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{vue,js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        mood: {
          accent: 'var(--mood-accent)',
          soft: 'var(--mood-accent-soft)',
          glow: 'var(--mood-glow)',
          chart: 'var(--mood-chart)',
          hover: 'var(--mood-hover-bg)',
          'nav-active': 'var(--mood-nav-active)',
          'nav-text': 'var(--mood-nav-active-text)',
        },
        dark: {
          bg: 'var(--bg-primary)',
          surface: 'var(--bg-secondary)',
          card: 'var(--bg-card)',
          'card-hover': 'var(--bg-card-hover)',
        },
        border: {
          subtle: 'var(--border-subtle)',
          medium: 'var(--border-medium)',
        },
        txt: {
          primary: 'var(--text-primary)',
          secondary: 'var(--text-secondary)',
          muted: 'var(--text-muted)',
          inverse: 'var(--text-inverse)',
        },
      },
      borderRadius: {
        'xl': '1rem',
        '2xl': '1.5rem',
        '3xl': '2rem',
      },
      fontFamily: {
        sans: ['"Noto Sans SC"', '"PingFang SC"', 'system-ui', 'sans-serif'],
      },
      animation: {
        'float-in': 'float-in 0.5s ease-out both',
        'float-in-1': 'float-in 0.5s ease-out 0.1s both',
        'float-in-2': 'float-in 0.5s ease-out 0.2s both',
        'float-in-3': 'float-in 0.5s ease-out 0.3s both',
        'pulse-glow': 'pulse-glow 4s ease-in-out infinite',
        'slow-spin': 'slow-spin 20s linear infinite',
        'blink': 'blink 1s step-end infinite',
        'breathe': 'breathe-ring 6s ease-in-out infinite',
        'bio-breathe': 'bio-breathe 6s ease-in-out infinite',
        'fade-in': 'fade-in 0.3s ease-out',
        'scale-in': 'scale-in 0.2s ease-out',
      },
      keyframes: {
        'float-in': {
          from: { opacity: '0', transform: 'translateY(20px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'pulse-glow': {
          '0%, 100%': { boxShadow: '0 0 20px var(--mood-glow)' },
          '50%': { boxShadow: '0 0 40px var(--mood-glow), 0 0 60px var(--mood-glow)' },
        },
        'slow-spin': {
          from: { transform: 'rotate(0deg)' },
          to: { transform: 'rotate(360deg)' },
        },
        'blink': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0' },
        },
        'breathe-ring': {
          '0%': { transform: 'scale(0.8)', opacity: '0.4' },
          '50%': { transform: 'scale(1.15)', opacity: '0.8' },
          '100%': { transform: 'scale(0.8)', opacity: '0.4' },
        },
        'bio-breathe': {
          '0%, 100%': { opacity: '0.15', transform: 'scale(0.8)' },
          '50%': { opacity: '0.5', transform: 'scale(1.2)' },
        },
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'scale-in': {
          '0%': { opacity: '0', transform: 'scale(0.9)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [],
};
