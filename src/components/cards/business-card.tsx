import { Link } from 'react-router-dom'
import { ChevronRight, MapPin, Navigation } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Rating } from '@/components/ui/rating'
import { CallButton } from '@/components/call-button'
import { ListingArt } from '@/components/listing-art'
import { OpenStatus, VerifiedBadge } from '@/components/status'
import { CATEGORY_MAP } from '@/data/categories'
import type { ScoredBusiness } from '@/data/types'
import { directionsHref, formatDistance } from '@/lib/format'
import { useI18n } from '@/lib/i18n'
import { cn } from '@/lib/utils'

/**
 * The standard result row. Everything above the action bar is one link target,
 * so the whole card is tappable, while Call and Directions stay independent
 * controls rather than nested interactive elements.
 */
export function BusinessCard({
  result,
  className,
  showDistance = true,
}: {
  result: ScoredBusiness
  className?: string
  showDistance?: boolean
}) {
  const { t, L, n, locale } = useI18n()
  const { business: b, distanceKm } = result
  const cat = CATEGORY_MAP[b.category]

  return (
    <Card className={cn('list-perf overflow-hidden p-0', className)}>
      <Link
        to={`/business/${b.slug}`}
        className="group flex gap-4 p-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"
      >
        <ListingArt
          seed={b.imageSeed}
          icon={cat.icon}
          className="size-20 shrink-0 sm:size-24"
        />

        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-2">
            <h3 className="min-w-0 flex-1 text-body font-bold leading-snug text-balance transition-colors group-hover:text-primary">
              {L(b.name)}
            </h3>
            {b.verified && <VerifiedBadge withLabel={false} className="mt-0.5 shrink-0" />}
          </div>

          <p className="mt-1 truncate text-meta font-medium text-ink-subtle">
            {L(cat.name)}
            {showDistance && distanceKm > 0 && (
              <>
                <span className="mx-1.5" aria-hidden="true">
                  ·
                </span>
                <span className="tnum">
                  {n(formatDistance(distanceKm, locale))} {t('card.away')}
                </span>
              </>
            )}
          </p>

          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
            <OpenStatus hours={b.hours} />
            <Rating value={b.rating} count={b.reviewCount} />
          </div>

          <p className="mt-2 line-clamp-2 text-meta leading-relaxed text-pretty text-ink-muted">
            {L(b.description)}
          </p>
        </div>

        <ChevronRight
          className="mt-1 hidden size-5 shrink-0 self-center text-ink-subtle transition-transform group-hover:translate-x-0.5 sm:block"
          aria-hidden="true"
        />
      </Link>

      <div className="flex gap-2 border-t border-line p-3">
        <CallButton phone={b.phone} label={L(b.name)} size="md" className="flex-1" />
        <Button asChild variant="secondary" size="md" className="flex-1">
          <a
            href={directionsHref(b.coords, L(b.name))}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Navigation />
            {t('card.directions')}
          </a>
        </Button>
      </div>
    </Card>
  )
}

/** Compact variant for horizontal rails on the homepage. */
export function BusinessRailCard({ result }: { result: ScoredBusiness }) {
  const { t, L, n, locale } = useI18n()
  const { business: b, distanceKm } = result
  const cat = CATEGORY_MAP[b.category]

  return (
    <Card className="w-[264px] overflow-hidden p-0" interactive>
      <Link
        to={`/business/${b.slug}`}
        className="group block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"
      >
        <div className="relative">
          <ListingArt seed={b.imageSeed} icon={cat.icon} rounded={false} className="h-32 w-full" />
          {b.verified && (
            <div className="absolute left-3 top-3">
              <VerifiedBadge />
            </div>
          )}
        </div>

        <div className="p-4">
          <h3 className="truncate text-body font-bold transition-colors group-hover:text-primary">
            {L(b.name)}
          </h3>
          <p className="mt-0.5 truncate text-meta font-medium text-ink-subtle">{L(cat.name)}</p>

          <div className="mt-2 flex items-center justify-between gap-2">
            <OpenStatus hours={b.hours} />
            <Rating value={b.rating} />
          </div>

          {distanceKm > 0 && (
            <p className="mt-1.5 flex items-center gap-1 text-meta text-ink-subtle">
              <MapPin className="size-3.5 shrink-0" aria-hidden="true" />
              <span className="tnum">{n(formatDistance(distanceKm, locale))}</span>
            </p>
          )}
        </div>
      </Link>

      <div className="px-4 pb-4">
        <CallButton phone={b.phone} label={L(b.name)} size="md" block>
          {t('card.call')}
        </CallButton>
      </div>
    </Card>
  )
}
