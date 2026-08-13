import { useId, type ReactNode } from 'react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

/* ==========================================================================
 * Form primitives.
 *
 * The rule these exist to enforce: an admin is never asked to type structured
 * text. No JSON, no comma-separated ids, no "enter the hours as an array".
 * Anything with shape gets a control that understands that shape.
 *
 * Bilingual fields sit side by side rather than on separate tabs, because a
 * record with an English name and no Bengali one is the common failure and it
 * should be visible while typing, not discovered later on the public site.
 * ========================================================================== */

export function FormSection({
  heading,
  description,
  children,
}: {
  heading: string
  description?: string
  children: ReactNode
}) {
  return (
    <section className="rounded-card border border-line bg-surface p-5 shadow-card">
      <h2 className="text-heading">{heading}</h2>
      {description && <p className="mt-1 text-meta text-ink-muted">{description}</p>}
      <div className="mt-4 grid gap-4 sm:grid-cols-2">{children}</div>
    </section>
  )
}

export function Field({
  label,
  hint,
  error,
  required,
  wide,
  children,
}: {
  label: string
  hint?: string
  error?: string
  required?: boolean
  wide?: boolean
  children: (props: { id: string; describedBy?: string }) => ReactNode
}) {
  const id = useId()
  const hintId = hint ? `${id}-hint` : undefined
  const errorId = error ? `${id}-error` : undefined
  const describedBy = [errorId, hintId].filter(Boolean).join(' ') || undefined

  return (
    <div className={cn('min-w-0', wide && 'sm:col-span-2')}>
      <label htmlFor={id} className="block text-meta font-bold text-ink-muted">
        {label}
        {required && (
          <span className="text-danger" aria-hidden="true">
            {' '}
            *
          </span>
        )}
      </label>
      <div className="mt-1.5">{children({ id, describedBy })}</div>
      {error ? (
        <p id={errorId} className="mt-1.5 text-meta font-semibold text-danger">
          {error}
        </p>
      ) : (
        hint && (
          <p id={hintId} className="mt-1.5 text-meta text-ink-subtle">
            {hint}
          </p>
        )
      )}
    </div>
  )
}

export function TextArea({
  className,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      rows={4}
      className={cn(
        'flex w-full rounded-control border border-line bg-surface px-4 py-3 text-body text-ink',
        'placeholder:text-ink-subtle',
        'focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25',
        'disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    />
  )
}

export function Select({
  className,
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        'flex h-12 w-full rounded-control border border-line bg-surface px-3.5 text-body text-ink',
        'focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25',
        'disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    >
      {children}
    </select>
  )
}

/** Switch styled as a checkbox row — a full-width tap target, not a 20px box. */
export function ToggleField({
  label,
  hint,
  checked,
  onChange,
  disabled,
}: {
  label: string
  hint?: string
  checked: boolean
  onChange: (next: boolean) => void
  disabled?: boolean
}) {
  const id = useId()
  return (
    <div className="sm:col-span-2">
      <label
        htmlFor={id}
        className={cn(
          'flex cursor-pointer items-start gap-3 rounded-control border border-line bg-canvas px-4 py-3',
          'transition-colors hover:bg-surface-2',
          disabled && 'cursor-not-allowed opacity-50',
        )}
      >
        <input
          id={id}
          type="checkbox"
          checked={checked}
          disabled={disabled}
          onChange={(e) => onChange(e.target.checked)}
          className="mt-0.5 size-5 shrink-0 accent-[hsl(var(--primary))]"
        />
        <span className="min-w-0">
          <span className="block text-body-sm font-semibold text-ink">{label}</span>
          {hint && <span className="mt-0.5 block text-meta text-ink-subtle">{hint}</span>}
        </span>
      </label>
    </div>
  )
}

export { Input }
