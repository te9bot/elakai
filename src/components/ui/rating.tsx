import { Star } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useI18n } from '@/lib/i18n'

type RatingProps = {
  value: number
  count?: number
  /** Draw the five-star row. Off by default — the numeral alone is faster to read. */
  showStars?: boolean
  size?: 'sm' | 'md'
  className?: string
}

/**
 * Rating readout. Amber is used as an icon fill only, never as a background
 * behind text, because #F59E0B cannot carry accessible label text.
 */
export function Rating({ value, count, showStars = false, size = 'sm', className }: RatingProps) {
  const { t, n } = useI18n()
  const isNew = !value || value <= 0

  if (isNew) {
    return (
      <span className={cn('text-meta font-semibold text-ink-subtle', className)}>
        {t('card.noRating')}
      </span>
    )
  }

  const rounded = Math.round(value * 10) / 10

  return (
    <span
      className={cn('inline-flex items-center gap-1', className)}
      aria-label={`${rounded} out of 5${count ? `, ${count} reviews` : ''}`}
    >
      {showStars ? (
        <span className="inline-flex" aria-hidden="true">
          {[0, 1, 2, 3, 4].map((i) => (
            <Star
              key={i}
              className={cn(
                size === 'sm' ? 'size-3.5' : 'size-4',
                i < Math.round(value)
                  ? 'fill-warning text-warning'
                  : 'fill-transparent text-line',
              )}
            />
          ))}
        </span>
      ) : (
        <Star
          className={cn(size === 'sm' ? 'size-3.5' : 'size-4', 'fill-warning text-warning')}
          aria-hidden="true"
        />
      )}
      <span
        className={cn(
          'tnum font-bold text-ink',
          size === 'sm' ? 'text-meta' : 'text-body-sm',
        )}
      >
        {n(rounded.toFixed(1))}
      </span>
      {count !== undefined && count > 0 && (
        <span className="tnum text-meta text-ink-subtle">({n(count)})</span>
      )}
    </span>
  )
}
