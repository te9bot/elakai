import { Phone } from 'lucide-react'
import { Button, type ButtonProps } from '@/components/ui/button'
import { useI18n } from '@/lib/i18n'
import { normalizePhone } from '@/lib/phone'
import { cn } from '@/lib/utils'

/* ==========================================================================
 * Tap-to-call.
 *
 * One rule, and no interstitial: if the record carries a dialable number the
 * button is a `tel:` link and the device's call interface opens on the first
 * tap. There is no confirmation dialog, no warning, and no acknowledgement
 * step between the user and the call.
 *
 * A number that cannot be dialled — absent, unparseable, or one of the
 * reserved sample numbers still sitting on unedited records — renders no
 * button at all rather than one that opens an explanation. A control that does
 * not do the thing it names is worse than an absent one, and on an emergency
 * card it is worse still.
 *
 * Callers that need to say something in that empty space use
 * `CallUnavailable` below; most simply let the layout close up.
 * ========================================================================== */

type CallButtonProps = Omit<ButtonProps, 'asChild' | 'onClick'> & {
  phone: string
  /** Accessible name context, e.g. the business name. */
  label?: string
  showIcon?: boolean
  children?: React.ReactNode
}

export function CallButton({
  phone,
  label,
  showIcon = true,
  className,
  variant = 'primary',
  size = 'lg',
  children,
  ...props
}: CallButtonProps) {
  const { t } = useI18n()
  const { e164 } = normalizePhone(phone)

  if (!e164) return null

  return (
    <Button asChild variant={variant} size={size} className={className} {...props}>
      <a href={`tel:${e164}`} aria-label={label ? `${t('card.call')} ${label}` : undefined}>
        {showIcon && <Phone />}
        {children ?? t('card.call')}
      </a>
    </Button>
  )
}

/** Whether `CallButton` would render anything for this number. */
export function canCall(phone: string | null | undefined): boolean {
  return normalizePhone(phone).e164 !== null
}

/**
 * The honest empty state for a record with no dialable number.
 *
 * Used only where the absence would otherwise read as a missing feature — a
 * detail page's contact block, say. Deliberately not a disabled button: a
 * greyed-out "Call" invites repeated tapping, while a plain line of text is
 * read once and understood.
 */
export function CallUnavailable({ className }: { className?: string }) {
  return (
    <p className={cn('text-body-sm text-ink-subtle', className)}>Phone number unavailable</p>
  )
}

/**
 * A phone number as a line of text — a link when it can be dialled, plain text
 * when it cannot.
 *
 * Used on detail pages, where the number is information rather than the
 * primary action. Both states render the same normalized display string.
 */
export function PhoneLink({ phone, className }: { phone: string; className?: string }) {
  const { e164, display } = normalizePhone(phone)
  if (!display) return null

  if (!e164) return <span className={cn('tnum font-bold', className)}>{display}</span>

  return (
    <a
      href={`tel:${e164}`}
      className={cn(
        'tnum rounded font-bold transition-opacity hover:opacity-70',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
        className,
      )}
    >
      {display}
    </a>
  )
}
