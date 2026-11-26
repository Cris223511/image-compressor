/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: ['class', '[data-theme="dark"]'],
  theme: {
    extend: {
      // ningún cambio al pasar el cursor dura menos de 300 ms
      transitionDuration: { DEFAULT: '300ms', 150: '300ms', 200: '300ms' },
      colors: {
        bg: 'rgb(var(--bg) / <alpha-value>)',
        surface: 'rgb(var(--surface) / <alpha-value>)',
        sunken: 'rgb(var(--sunken) / <alpha-value>)',
        ink: 'rgb(var(--ink) / <alpha-value>)',
        muted: 'rgb(var(--muted) / <alpha-value>)',
        line: 'rgb(var(--line) / <alpha-value>)',
        brand: 'rgb(var(--brand) / <alpha-value>)',
        'brand-soft': 'rgb(var(--brand-soft) / <alpha-value>)',
        good: 'rgb(var(--good) / <alpha-value>)',
        'good-soft': 'rgb(var(--good-soft) / <alpha-value>)',
        warn: 'rgb(var(--warn) / <alpha-value>)',
        'warn-soft': 'rgb(var(--warn-soft) / <alpha-value>)',
        bad: 'rgb(var(--bad) / <alpha-value>)',
        'bad-soft': 'rgb(var(--bad-soft) / <alpha-value>)',
      },
      fontFamily: {
        display: ['"Bricolage Grotesque Variable"', 'system-ui', 'sans-serif'],
        sans: ['"Instrument Sans Variable"', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 2px rgb(var(--shadow) / 0.06), 0 8px 28px -12px rgb(var(--shadow) / 0.16)',
        lift: '0 2px 4px rgb(var(--shadow) / 0.08), 0 18px 40px -14px rgb(var(--brand) / 0.55)',
      },
    },
  },
  plugins: [],
}
