import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

import { AuthBrandPanel } from '@/components/account/auth-brand-panel'
import { cn } from '@/lib/utils'
import logo from '../../../assets/elakai-logo.png'

/* ==========================================================================
 * The frame every account screen sits in.
 *
 * A SPLIT, NOT A CARD ON A WASH
 *
 * This was a single centred glass card, reached from a modal. Both are gone.
 * Pressing Contribute now navigates here, and here is a whole page: the brand
 * plate on the left (components/account/auth-brand-panel.tsx) and the form on
 * the right. The reasoning for dropping the modal is written up in that file;
 * the reasoning for the layout is that a full page is what makes the
 * contributor side read as part of ELAKAI rather than as an interruption to
 * it.
 *
 * WHAT SURVIVED THE REWRITE, AND WHY
 *
 * "Continue browsing", still first in the DOM and first in the tab order. The
 * modal's third button was the best thing about it — a visitor asked to sign
 * in must be able to decline and carry on reading — and losing the modal must
 * not mean losing that. It is a link at the top of the form column now.
 *
 * ONE COLUMN BELOW `lg`
 *
 * The brand plate is `hidden lg:block`, so a phone gets the form and nothing
 * competing with it. That is not a compromise: on a 390px screen a decorative
 * half would push the password field below the fold, and the lockup above the
 * heading already carries the identity. The animation is desktop-only by the
 * same argument — it is the one place there is room for it to be immersive.
 *
 * ON THE GLASS (§10, §55)
 *
 * The brief asks for glassmorphism and then, twice, asks for it to be
 * restrained. src/index.css already settled that argument above
 * `.glass-surface`: *if everything is glass, nothing is emphasised.* The card
 * no longer needs to be glass now that it sits on a plain column beside a
 * loud panel — glass over nothing is just a lighter grey — so the surface is
 * honest and the depth on this screen comes from the split itself.
 * ========================================================================== */

export function AuthShell({
  title,
  subtitle,
  children,
  footer,
  /** Shown above the form. Lets someone abandon the flow and keep browsing. */
  backTo = '/',
  backLabel = 'Continue browsing',
  /** Widens the form column for the two-column signup. */
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
    <main className="grid min-h-dvh bg-canvas lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
      <AuthBrandPanel />

      <div className="flex min-h-dvh flex-col justify-center px-5 py-10 sm:px-8 lg:min-h-0 lg:px-12">
        <div className={cn('mx-auto w-full', wide ? 'max-w-md' : 'max-w-sm')}>
          {/*
           * The way out, above everything else in the column.
           *
           * §4 of the brief: a visitor asked to sign in must always be able to
           * close the request and carry on reading. First in the DOM means it
           * is also the first thing a keyboard or screen reader reaches,
           * rather than something to be found after the form.
           */}
          <Link
            to={backTo}
            className={cn(
              'mb-8 inline-flex items-center gap-1.5 rounded-control px-1 py-1 text-meta font-semibold',
              'text-ink-subtle transition-colors hover:text-ink',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
            )}
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            {backLabel}
          </Link>

          {/*
           * The lockup, on small screens only. Above `lg` the brand plate is
           * showing the mark at 22rem two inches to the left, and repeating it
           * here would read as a mistake.
           */}
          <img
            src={logo}
            alt="ELAKAI"
            width={512}
            height={471}
            className="mb-6 h-14 w-auto object-contain lg:hidden"
          />

          <h1 className="text-title">{title}</h1>
          {subtitle && (
            <p className="mt-2 max-w-[38ch] text-body-sm text-ink-muted">{subtitle}</p>
          )}

          <div className="mt-8">{children}</div>

          {footer && <div className="mt-6 text-body-sm text-ink-muted">{footer}</div>}
        </div>
      </div>
    </main>
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
