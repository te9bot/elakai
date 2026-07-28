import { BadgeCheck, Clock } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { formatTime, getOpenState } from '@/lib/format'
import { useI18n } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import type { WeeklyHours } from '@/data/types'

/**
 * Open/closed indicator.
 *
 * Green is carried by the dot, not by a filled pill behind white text —
 * #16A34A only reaches 3.1:1 against white, which fails AA for label text.
 * The word itself sits on the normal surface at full ink contrast.
 */
export function OpenStatus({
  hours,
  showNext = false,
  className,
}: {
  hours: WeeklyHours
  showNext?: boolean
  className?: string
}) {
  const { t, n, locale } = useI18n()
  const state = getOpenState(hours)

  const label = state.isAlways
    ? t('card.open24')
    : state.isOpen
      ? t('card.open')
      : t('card.closed')

  return (
    <span className={cn('inline-flex items-center gap-1.5 text-meta font-semibold', className)}>
      <span
        className={cn(
          'size-2 shrink-0 rounded-full',
          state.isOpen ? 'bg-success' : 'bg-ink-subtle/60',
        )}
        aria-hidden="true"
      />
      <span className={state.isOpen ? 'text-success-ink' : 'text-ink-subtle'}>{label}</span>
      {showNext && state.nextChange !== undefined && !state.isAlways && (
        <span className="tnum font-medium text-ink-subtle">
          · {state.isOpen ? t('card.closesAt') : t('card.opensAt')}{' '}
          {n(formatTime(state.nextChange, locale))}
        </span>
      )}
    </span>
  )
}

/** Verification mark. Blue passes AA on white, so this one can be a solid fill. */
export function VerifiedBadge({
  size = 'sm',
  withLabel = true,
  className,
}: {
  size?: 'sm' | 'md'
  withLabel?: boolean
  className?: string
}) {
  const { t } = useI18n()

  if (!withLabel) {
    return (
      <span className={cn('inline-flex text-primary', className)} title={t('card.verified')}>
        <BadgeCheck className={size === 'sm' ? 'size-4' : 'size-5'} aria-hidden="true" />
        <span className="sr-only">{t('card.verified')}</span>
      </span>
    )
  }

  return (
    <Badge variant="primary" size={size === 'sm' ? 'sm' : 'md'} className={className}>
      <BadgeCheck aria-hidden="true" />
      {t('card.verified')}
    </Badge>
  )
}

export function Available24Badge({ className }: { className?: string }) {
  const { t } = useI18n()
  return (
    <Badge variant="success" size="sm" className={className}>
      <Clock aria-hidden="true" />
      {t('emergency.available24')}
    </Badge>
  )
}
