import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

import { cn } from '@/lib/utils'
import logo from '../../../assets/elakai-logo.png'

/* ==========================================================================
 * The frame every account screen sits in.
 *
 * ON THE GLASS (§10, §55)
 *
 * The brief asks for glassmorphism and then, twice, asks for it to be
 * restrained. This project already had that argument with itself and wrote the
 * answer down in src/index.css, above `.glass-surface`: *if everything is
 * glass, nothing is emphasised.* Before this file there were exactly two glass
 * surfaces on the whole site — the top nav on scroll, and the action bar.
 *
 * This is the third, and the case for it is that an auth screen is the one
 * place with nothing else to look at. There is no content for a translucent
 * panel to compete with, so the depth reads as depth rather than as noise. It
 * uses the existing `.glass-surface` utility and the existing tokens rather
 * than a new palette, which is what keeps it recognisably ELAKAI instead of a
 * generic frosted login.
 *
 * What it deliberately is not: a glowing card, a gradient border, a neon
 * accent, or a second brand. One translucent panel, one soft primary wash
 * behind it, and the real lockup.
 *
 * ON THE BACKDROP
 *
 * The wash is `--primary` at low alpha, the same hue the buttons and links
 * already use. Two blurred ellipses rather than a full-bleed gradient, because
 * a gradient across the whole viewport is what makes a page feel like a
 * template — this reads as light falling on the canvas.
 * ========================================================================== */

export function AuthShell({
  title,
  subtitle,
  children,
  footer,
  /** Shown above the card. Lets someone abandon the flow and keep browsing. */
  backTo = '/',
  backLabel = 'Continue browsing',
  /** Widens the card for the two-column signup. */
  wide = false,
}: {
  title: string
  subtitle?: string
  children: React.ReactNode
  footer?: React.ReactNode
  backTo?: string
  backLabel?: string
  wide?: boolean
}) {
  return (
    <main className="relative grid min-h-dvh place-items-center overflow-hidden bg-canvas px-4 py-10">
      <Backdrop />

      <div className={cn('relative w-full', wide ? 'max-w-md' : 'max-w-sm')}>
        {/*
         * The way out, above everything else on the screen.
         *
         * §4 of the brief: a visitor asked to sign in must always be able to
         * close the request and carry on reading. Putting it first in the DOM
         * means it is also the first thing a keyboard or screen reader reaches,
         * rather than something to be found after the form.
         */}
        <Link
          to={backTo}
          className={cn(
            'mb-6 inline-flex items-center gap-1.5 rounded-control px-1 py-1 text-meta font-semibold',
            'text-ink-subtle transition-colors hover:text-ink',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
          )}
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          {backLabel}
        </Link>

        <div className="glass-surface rounded-card p-6 sm:p-8">
          <div className="flex flex-col items-center text-center">
            <img
              src={logo}
              alt="ELAKAI"
              width={512}
              height={471}
              className="h-16 w-auto object-contain"
            />
            <h1 className="mt-4 text-title">{title}</h1>
            {subtitle && (
              <p className="mt-1.5 max-w-[34ch] text-body-sm text-ink-muted">{subtitle}</p>
            )}
          </div>

          <div className="mt-7">{children}</div>
        </div>

        {footer && <div className="mt-5 text-center text-body-sm text-ink-muted">{footer}</div>}
      </div>
    </main>
  )
}

/**
 * Two soft primary ellipses behind the card.
 *
 * `aria-hidden` and `pointer-events-none`: it is lighting, not content. Sized
 * in viewport units so it scales with the screen rather than becoming a small
 * smudge on a monitor and a full wash on a phone.
 */
function Backdrop() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      <div
        className="absolute -left-[15vw] -top-[20vh] size-[60vmax] rounded-full opacity-[0.55] blur-3xl"
        style={{
          background:
            'radial-gradient(closest-side, hsl(var(--primary) / 0.16), transparent 70%)',
        }}
      />
      <div
        className="absolute -bottom-[25vh] -right-[10vw] size-[50vmax] rounded-full opacity-[0.45] blur-3xl"
        style={{
          background:
            'radial-gradient(closest-side, hsl(var(--primary) / 0.12), transparent 70%)',
        }}
      />
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Form parts                                                          */
/* ------------------------------------------------------------------ */

/**
 * A labelled field.
 *
 * The label is a real `<label>` bound by `htmlFor`, and the hint and the error
 * are wired into `aria-describedby` — so a screen reader reading the input also
 * reads why it was rejected, rather than announcing an unexplained invalid
 * state. §74.
 */
export function Field({
  id,
  label,
  hint,
  error,
  children,
}: {
  id: string
  label: string
  hint?: string
  error?: string | null
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-meta font-bold text-ink-muted">
        {label}
      </label>
      {children}
      {hint && !error && (
        <p id={`${id}-hint`} className="text-meta text-ink-subtle">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} role="alert" className="text-meta font-semibold text-danger">
          {error}
        </p>
      )}
    </div>
  )
}

/** The describedby value for a field, so callers do not assemble it by hand. */
export function describedBy(id: string, hint?: string, error?: string | null): string | undefined {
  if (error) return `${id}-error`
  if (hint) return `${id}-hint`
  return undefined
}

export function FormNotice({
  tone = 'danger',
  children,
}: {
  tone?: 'danger' | 'warning' | 'success' | 'info'
  children: React.ReactNode
}) {
  return (
    <div
      role="alert"
      className={cn(
        'rounded-control border px-4 py-3 text-meta',
        tone === 'danger' && 'border-danger/30 bg-danger-soft text-danger-ink',
        tone === 'warning' && 'border-warning/30 bg-warning-soft text-warning-ink',
        tone === 'success' && 'border-success/30 bg-success-soft text-success-ink',
        tone === 'info' && 'border-line bg-surface-2 text-ink-muted',
      )}
    >
      {children}
    </div>
  )
}
