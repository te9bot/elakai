import { Navigation } from 'lucide-react'
import { Button, type ButtonProps } from '@/components/ui/button'
import { useI18n } from '@/lib/i18n'
import { resolveDirections, type DirectionsTarget } from '@/lib/directions'

/* ==========================================================================
 * The Directions control.
 *
 * One component for every card, panel and detail page, so the rules in
 * `lib/directions.ts` cannot be applied in one place and forgotten in another.
 *
 * Renders nothing when the record has no real destination — see that module for
 * why an approximate coordinate is treated as none. Callers therefore do not
 * need to test first; they place it and let it decide.
 *
 * Opens in a new tab, since it hands off to a map application, with
 * `rel="noopener"` so the opened page gets no handle back to this one.
 * ========================================================================== */

type DirectionsButtonProps = Omit<ButtonProps, 'asChild' | 'onClick'> &
  DirectionsTarget & {
    /** Hide the text and keep the icon, for tight card footers. */
    iconOnly?: boolean
    children?: React.ReactNode
  }

export function DirectionsButton({
  coords,
  coordsApprox,
  address,
  label,
  iconOnly = false,
  variant = 'secondary',
  size = 'lg',
  className,
  children,
  ...props
}: DirectionsButtonProps) {
  const { t } = useI18n()
  const resolved = resolveDirections({ coords, coordsApprox, address, label })

  if (!resolved) return null

  const text = children ?? t('card.directions')

  return (
    <Button asChild variant={variant} size={size} className={className} {...props}>
      <a
        href={resolved.href}
        target="_blank"
        rel="noopener noreferrer"
        // Always names the destination, because the visible label may be an
        // icon alone and "Directions" on its own says nothing about where to.
        aria-label={label ? `${t('card.directions')} — ${label}` : t('card.directions')}
      >
        <Navigation aria-hidden="true" />
        {iconOnly ? <span className="sr-only">{text}</span> : text}
      </a>
    </Button>
  )
}
