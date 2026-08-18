import type { Config } from 'tailwindcss'

/**
 * ELAKAI design system.
 *
 * All colour is driven by CSS custom properties declared in `src/index.css`
 * so that the dark theme is a single class toggle on <html>.
 *
 * Contrast note that shapes the whole UI: white text on Success (teal-green) is
 * ~3.3:1 and on Warning (#F59E0B) is ~2:1 — both fail WCAG AA for body text.
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
        // Kept as an escape hatch for the rare place that must force the Bangla
        // cut. It is no longer a *different* typeface from the UI stack, only a
        // different script of the same family, so using it never introduces the
        // seam it used to.
        bangla: ['"Anek Bangla Variable"', 'var(--font-ui)', 'sans-serif'],
      },
      fontSize: {
        // Fluid scale — mobile-first, never smaller than 15px for body copy.
        // Landing-page display size. Larger and tighter than anything in the
        // app: the landing headline is read once, from further away, and is the
        // only place type is asked to carry the whole composition.
        /*
         * Retuned for Anek, and tuned for Bangla first.
         *
         * The default locale is `bn`, so Bangla is the primary reading
         * experience rather than a translation of it. Two consequences run
         * through every line below:
         *
         *   Leading is more generous than a Latin-only scale would want.
         *   Bangla sets matras above and below the base line, and the tight
         *   0.98 leading the old display sizes used was drawn for Manrope
         *   setting English. In Bangla it collides.
         *
         *   Negative tracking is roughly a third of what it was. Latin display
         *   type likes to be pulled tight; Bangla conjuncts do not, and past
         *   about -0.02em they start to touch. The remaining negative values
         *   are safe for both, and `html[lang="bn"]` neutralises them entirely
         *   at display sizes — see index.css.
         *
         * Anek also has a taller x-height than Manrope at the same nominal
         * size, so the body sizes read a little larger than the numbers
         * suggest and did not need to grow.
         */
        'display-xl': ['clamp(2.75rem, 1.2rem + 6.4vw, 6rem)', { lineHeight: '1.04', letterSpacing: '-0.028em', fontWeight: '800' }],
        'display-lg': ['clamp(2.5rem, 1.6rem + 4.5vw, 4.25rem)', { lineHeight: '1.08', letterSpacing: '-0.024em', fontWeight: '800' }],
        display: ['clamp(2rem, 1.35rem + 3.2vw, 3.25rem)', { lineHeight: '1.12', letterSpacing: '-0.02em', fontWeight: '780' }],
        title: ['clamp(1.375rem, 1.15rem + 1.1vw, 1.875rem)', { lineHeight: '1.26', letterSpacing: '-0.014em', fontWeight: '700' }],
        heading: ['clamp(1.125rem, 1.05rem + 0.4vw, 1.3125rem)', { lineHeight: '1.34', letterSpacing: '-0.008em', fontWeight: '650' }],
        body: ['1rem', { lineHeight: '1.68' }],
        'body-sm': ['0.9375rem', { lineHeight: '1.62' }],
        meta: ['0.8125rem', { lineHeight: '1.5', letterSpacing: '0.004em' }],
        // Eyebrow/label type. Anek needs more tracking than Manrope did to stay
        // legible this small, and Bangla needs the extra room more than Latin.
        micro: ['0.6875rem', { lineHeight: '1.4', letterSpacing: '0.1em', fontWeight: '700' }],
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
        /* Ambient motion. All three are transform/opacity only so they stay on
           the compositor — the hero runs several at once on a budget phone.
           The global prefers-reduced-motion rule in index.css stops them. */
        float: {
          '0%, 100%': { transform: 'translate3d(0, 0, 0)' },
          '50%': { transform: 'translate3d(0, -18px, 0)' },
        },
        'float-alt': {
          '0%, 100%': { transform: 'translate3d(0, 0, 0)' },
          '50%': { transform: 'translate3d(14px, 12px, 0)' },
        },
        sheen: {
          '0%': { transform: 'translate3d(-140%, 0, 0) skewX(-14deg)' },
          '100%': { transform: 'translate3d(320%, 0, 0) skewX(-14deg)' },
        },
        /* Loading identity. `breathe` is deliberately shallow — a loading mark
           that visibly throbs reads as an error state, not as progress. */
        breathe: {
          '0%, 100%': { opacity: '0.62', transform: 'scale(0.97)' },
          '50%': { opacity: '1', transform: 'scale(1)' },
        },
        'bar-slide': {
          '0%': { transform: 'translate3d(-100%, 0, 0)' },
          '100%': { transform: 'translate3d(320%, 0, 0)' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.4s cubic-bezier(0.22, 1, 0.36, 1) both',
        'fade-in': 'fade-in 0.3s ease-out both',
        shimmer: 'shimmer 1.6s infinite',
        'pulse-ring': 'pulse-ring 2s cubic-bezier(0.22, 1, 0.36, 1) infinite',
        float: 'float 11s cubic-bezier(0.45, 0, 0.55, 1) infinite',
        'float-alt': 'float-alt 14s cubic-bezier(0.45, 0, 0.55, 1) infinite',
        sheen: 'sheen 6s cubic-bezier(0.22, 1, 0.36, 1) infinite',
        breathe: 'breathe 2.6s cubic-bezier(0.45, 0, 0.55, 1) infinite',
        'bar-slide': 'bar-slide 1.5s cubic-bezier(0.65, 0, 0.35, 1) infinite',
      },
    },
  },
  /*
   * No `motion-safe:` / `motion-reduce:` override any more, and no call site
   * uses either prefix.
   *
   * A plugin here used to redefine both, so they would answer to ELAKAI's own
   * `<html data-motion>` rather than to the operating system. It did not work.
   * The built CSS showed the utilities still compiled to Tailwind's stock
   *
   *   @media (prefers-reduced-motion: no-preference) { .motion-safe\:… }
   *
   * so `addVariant` never displaced the core variant, and the ~19 ambient
   * animations behind that prefix were switched off on any machine with the OS
   * flag set — whatever the site's own setting said. That included the machine
   * ELAKAI is developed on, which is why the hero glows and the pulse rings
   * appeared to be missing while the JavaScript parallax kept running.
   *
   * It is fixed by deletion rather than by a third attempt at the variant API.
   * ELAKAI now plays its full motion for everyone by explicit decision, so the
   * prefix has nothing left to express: the utilities are written plain
   * (`animate-float`, not `motion-safe:animate-float`) and always apply.
   *
   * To reintroduce a reduced mode, the sturdy shape is the inverted one — let
   * every animation compile unconditionally, then damp them all in a single
   * `html[data-motion='reduced']` rule in src/index.css. One rule cannot miss a
   * utility; a per-utility gate has to be right ~19 times and fails open.
   * src/lib/motion.ts has the rest of the decision.
   */
  plugins: [],
} satisfies Config
