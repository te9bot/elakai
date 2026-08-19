import { useId, useState, type ReactNode } from 'react'
import { Plus, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

/* ==========================================================================
 * Form primitives.
 *
 * The rule these exist to enforce: nobody is ever asked to type structured
 * text. No JSON, no comma-separated ids, no "enter the hours as an array".
 * Anything with shape gets a control that understands that shape.
 *
 * Bilingual fields sit side by side rather than on separate tabs, because a
 * record with an English name and no Bengali one is the common failure and it
 * should be visible while typing, not discovered later on the public site.
 *
 * WHY THIS IS NOT IN components/admin/
 *
 * It used to be, and it was right to be: the admin listing form was the only
 * form in the product. The contributor submission form is the second, and it
 * asks for very nearly the same things in very nearly the same order — so it
 * uses these, rather than a parallel set that would drift a token at a time
 * until the two forms stopped looking like one product.
 *
 * Moving it out of `admin/` is the whole of that change. No component here was
 * modified, and the two admin screens that already used them import from the
 * new path.
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
  children: (props: { id: string; describedBy?: string; invalid?: true }) => ReactNode
}) {
  const id = useId()
  const hintId = hint ? `${id}-hint` : undefined
  const errorId = error ? `${id}-error` : undefined
  const describedBy = [errorId, hintId].filter(Boolean).join(' ') || undefined

  return (
    /*
     * `data-invalid` marks the whole field, and index.css colours the control
     * inside it.
     *
     * A failed field used to change nothing but the colour of the message
     * underneath it. On a short form that is survivable; on the contribute
     * form, which is long enough to scroll several times, it meant the only
     * evidence of which field was wrong was a line of small red text that
     * might be off screen. The control itself now carries the state, so a
     * scan finds it.
     *
     * Driven from here rather than from each control because there are 46
     * `<Field>` call sites and they should not each have to remember. Call
     * sites that want `aria-invalid` on the element itself get `invalid`
     * passed to the render prop.
     */
    <div
      data-invalid={error ? 'true' : undefined}
      className={cn(
        'min-w-0',
        /*
         * The invalid border is generated as a Tailwind arbitrary variant
         * rather than written as a rule in index.css, and that is not a style
         * preference — it is the only version that works.
         *
         * Tailwind emits `.border-line` into the utilities layer, which comes
         * after everything in `@layer base`, and layer order settles the
         * cascade before specificity is consulted. Three plain-CSS attempts
         * were written and checked in the browser: a higher-specificity
         * `border-color` rule, a rebinding of the `--line` token, and the same
         * rule with `!important`. All three matched the element and went live
         * in the stylesheet, and in all three the computed border stayed
         * rgb(225,231,239).
         *
         * Written this way the rule is compiled into the utilities layer
         * alongside the class it needs to beat, so it lands where the cascade
         * can actually see it.
         */
        error &&
          cn(
            '[&_input]:!border-danger [&_select]:!border-danger [&_textarea]:!border-danger',
            // The ring follows the border, or a focused invalid field would
            // announce itself in two different colours at once.
            '[&_input]:focus-visible:!ring-danger/25 [&_textarea]:focus-visible:!ring-danger/25',
          ),
        wide && 'sm:col-span-2',
      )}
    >
      <label htmlFor={id} className="block text-meta font-bold text-ink-muted">
        {label}
        {required && (
          <span className="text-danger" aria-hidden="true">
            {' '}
            *
          </span>
        )}
      </label>
      <div className="mt-1.5">
        {children({ id, describedBy, invalid: error ? true : undefined })}
      </div>
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

/**
 * An editable list of short strings — the services a listing offers.
 *
 * A list, not a textarea of comma-separated values, for the reason stated at
 * the top of this file: an admin is never asked to type structured text. A
 * comma-separated field looks simpler until somebody's service is "X-ray, CT
 * and MRI", at which point the separator silently splits one entry into three
 * and nothing tells them.
 *
 * Entries are added with the button or by pressing Enter, which is what a
 * chip-style input trains people to expect. Enter is intercepted rather than
 * left to submit the surrounding form — finishing a service is not finishing
 * the listing, and a form that saves when you meant to add a row is worse than
 * one with an extra button.
 */
export function ServiceListField({
  label,
  hint,
  values,
  onChange,
  disabled,
  placeholder,
}: {
  label: string
  hint?: string
  values: string[]
  onChange: (next: string[]) => void
  disabled?: boolean
  placeholder?: string
}) {
  const id = useId()
  const hintId = hint ? `${id}-hint` : undefined
  const [draft, setDraft] = useState('')

  function add() {
    const value = draft.trim()
    if (!value) return
    // Case-insensitive, so "Blood test" and "blood test" cannot both be added
    // and then render as two identical tags on the public page.
    if (values.some((v) => v.toLowerCase() === value.toLowerCase())) {
      setDraft('')
      return
    }
    onChange([...values, value])
    setDraft('')
  }

  return (
    <div className="min-w-0 sm:col-span-2">
      <label htmlFor={id} className="block text-meta font-bold text-ink-muted">
        {label}
      </label>

      <div className="mt-1.5 flex gap-2">
        <Input
          id={id}
          aria-describedby={hintId}
          value={draft}
          disabled={disabled}
          placeholder={placeholder}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key !== 'Enter') return
            e.preventDefault()
            add()
          }}
          className="min-w-0 flex-1"
        />
        <Button
          type="button"
          variant="secondary"
          disabled={disabled || !draft.trim()}
          onClick={add}
          className="shrink-0"
        >
          <Plus aria-hidden="true" />
          Add
        </Button>
      </div>

      {hint && (
        <p id={hintId} className="mt-1.5 text-meta text-ink-subtle">
          {hint}
        </p>
      )}

      {values.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-2">
          {values.map((value, i) => (
            <li
              key={`${value}-${i}`}
              className="inline-flex max-w-full items-center gap-1.5 rounded-pill bg-surface-2 py-1 pl-3 pr-1 text-meta font-semibold text-ink"
            >
              <span className="min-w-0 break-words">{value}</span>
              <button
                type="button"
                disabled={disabled}
                onClick={() => onChange(values.filter((_, at) => at !== i))}
                aria-label={`Remove ${value}`}
                className="grid size-6 shrink-0 place-items-center rounded-full text-ink-subtle transition-colors hover:bg-danger-soft hover:text-danger-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:pointer-events-none disabled:opacity-40"
              >
                <X className="size-3.5" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export { Input }
