import type { Config } from 'tailwindcss'

/**
 * ELAKAI design system.
 *
 * All colour is driven by CSS custom properties declared in `src/index.css`
 * so that the dark theme is a single class toggle on <html>.
 *
 * Contrast note that shapes the whole UI: white text on Success (#16A34A) is
 * 3.1:1 and on Warning (#F59E0B) is ~2:1 — both fail WCAG AA for body text.
 * Only Primary and Danger are used as solid fills behind white labels. Success
 * and Warning appear as dots, icons, borders, and tinted fills with dark text.
 */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    container: {
      center: true,
      padding: { DEFAULT: '1rem', sm: '1.5rem', lg: '2rem' },
      screens: { '2xl': '1280px' },
    },
    extend: {
      colors: {
        canvas: 'hsl(var(--canvas) / <alpha-value>)',
        surface: 'hsl(var(--surface) / <alpha-value>)',
        'surface-2': 'hsl(var(--surface-2) / <alpha-value>)',
        line: 'hsl(var(--line) / <alpha-value>)',
        ink: 'hsl(var(--ink) / <alpha-value>)',
        'ink-muted': 'hsl(var(--ink-muted) / <alpha-value>)',
        'ink-subtle': 'hsl(var(--ink-subtle) / <alpha-value>)',

        primary: {
          DEFAULT: 'hsl(var(--primary) / <alpha-value>)',
          hover: 'hsl(var(--primary-hover) / <alpha-value>)',
          soft: 'hsl(var(--primary-soft) / <alpha-value>)',
          ink: 'hsl(var(--primary-ink) / <alpha-value>)',
        },
        danger: {
          DEFAULT: 'hsl(var(--danger) / <alpha-value>)',
          hover: 'hsl(var(--danger-hover) / <alpha-value>)',
          soft: 'hsl(var(--danger-soft) / <alpha-value>)',
          ink: 'hsl(var(--danger-ink) / <alpha-value>)',
        },
        success: {
          DEFAULT: 'hsl(var(--success) / <alpha-value>)',
          soft: 'hsl(var(--success-soft) / <alpha-value>)',
          ink: 'hsl(var(--success-ink) / <alpha-value>)',
        },
        warning: {
          DEFAULT: 'hsl(var(--warning) / <alpha-value>)',
          soft: 'hsl(var(--warning-soft) / <alpha-value>)',
          ink: 'hsl(var(--warning-ink) / <alpha-value>)',
        },
      },
      fontFamily: {
        sans: ['var(--font-ui)', 'system-ui', 'sans-serif'],
        bangla: ['"Noto Sans Bengali"', 'var(--font-ui)', 'sans-serif'],
      },
      fontSize: {
        // Fluid scale — mobile-first, never smaller than 15px for body copy.
        'display-lg': ['clamp(2.5rem, 1.6rem + 4.5vw, 4.25rem)', { lineHeight: '1.02', letterSpacing: '-0.035em', fontWeight: '800' }],
        display: ['clamp(2rem, 1.35rem + 3.2vw, 3.25rem)', { lineHeight: '1.06', letterSpacing: '-0.03em', fontWeight: '800' }],
        title: ['clamp(1.375rem, 1.15rem + 1.1vw, 1.875rem)', { lineHeight: '1.18', letterSpacing: '-0.02em', fontWeight: '700' }],
        heading: ['clamp(1.125rem, 1.05rem + 0.4vw, 1.3125rem)', { lineHeight: '1.28', letterSpacing: '-0.015em', fontWeight: '700' }],
        body: ['1rem', { lineHeight: '1.6' }],
        'body-sm': ['0.9375rem', { lineHeight: '1.55' }],
        meta: ['0.8125rem', { lineHeight: '1.45', letterSpacing: '0.005em' }],
        micro: ['0.6875rem', { lineHeight: '1.3', letterSpacing: '0.08em', fontWeight: '700' }],
      },
      borderRadius: {
        // Brief calls for 14–20px.
        card: '18px',
        control: '14px',
        pill: '999px',
        sheet: '24px',
      },
      boxShadow: {
        // Layered and soft — never a single hard line.
        card: '0 1px 2px -1px hsl(var(--shadow) / 0.10), 0 4px 12px -4px hsl(var(--shadow) / 0.10)',
        'card-hover':
          '0 2px 4px -2px hsl(var(--shadow) / 0.12), 0 12px 28px -8px hsl(var(--shadow) / 0.18)',
        lift: '0 8px 24px -6px hsl(var(--shadow) / 0.20), 0 24px 48px -16px hsl(var(--shadow) / 0.16)',
        bar: '0 -1px 0 0 hsl(var(--line)), 0 -8px 24px -12px hsl(var(--shadow) / 0.20)',
        focus: '0 0 0 3px hsl(var(--canvas)), 0 0 0 5.5px hsl(var(--primary))',
      },
      spacing: {
        tap: '48px', // minimum touch target across the app
        'safe-b': 'env(safe-area-inset-bottom, 0px)',
      },
      transitionTimingFunction: {
        out: 'cubic-bezier(0.22, 1, 0.36, 1)',
        spring: 'cubic-bezier(0.34, 1.4, 0.64, 1)',
      },
      keyframes: {
        'fade-up': {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'none' },
        },
        'fade-in': { from: { opacity: '0' }, to: { opacity: '1' } },
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
        'pulse-ring': {
          '0%': { transform: 'scale(0.9)', opacity: '0.7' },
          '70%': { transform: 'scale(1.6)', opacity: '0' },
          '100%': { transform: 'scale(1.6)', opacity: '0' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.4s cubic-bezier(0.22, 1, 0.36, 1) both',
        'fade-in': 'fade-in 0.3s ease-out both',
        shimmer: 'shimmer 1.6s infinite',
        'pulse-ring': 'pulse-ring 2s cubic-bezier(0.22, 1, 0.36, 1) infinite',
      },
    },
  },
  plugins: [],
} satisfies Config
