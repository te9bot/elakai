import { Bath, BedDouble, MapPin, Maximize, Sofa } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { CallButton } from '@/components/call-button'
import { ListingArt } from '@/components/listing-art'
import { VerifiedBadge } from '@/components/status'
import { AREA_MAP, CATEGORY_MAP } from '@/data/categories'
import type { Rental } from '@/data/types'
import { formatBDT } from '@/lib/format'
import { useI18n } from '@/lib/i18n'
import { cn } from '@/lib/utils'

/**
 * Rentals get a distinct shape from business results — price leads, because
 * that is the field people filter and compare on first.
 */
export function RentalCard({ rental, className }: { rental: Rental; className?: string }) {
  const { t, L, n } = useI18n()
  const cat = CATEGORY_MAP[rental.category]

  const tenantLabel =
    rental.tenantType === 'family'
      ? t('rentals.tenant.family')
      : rental.tenantType === 'bachelor'
        ? t('rentals.tenant.bachelor')
        : t('rentals.tenant.any')

  return (
    <Card className={cn('list-perf overflow-hidden p-0', className)}>
      <div className="sm:flex">
        <div className="relative shrink-0 sm:w-52">
          <ListingArt
            seed={rental.imageSeed}
            icon={cat.icon}
            rounded={false}
            className="h-40 w-full sm:h-full"
          />
          <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
            <Badge variant="solid" size="sm">
              {L(cat.name)}
            </Badge>
            {rental.verified && <VerifiedBadge />}
          </div>
        </div>

        <div className="flex min-w-0 flex-1 flex-col p-4">
          <div className="flex items-baseline gap-1.5">
            <span className="tnum text-title text-primary">{n(formatBDT(rental.rent))}</span>
            <span className="text-meta font-semibold text-ink-subtle">
              {t('rentals.perMonth')}
            </span>
          </div>

          <h3 className="mt-1 text-body font-bold leading-snug text-balance">{L(rental.title)}</h3>

          <p className="mt-1 flex items-center gap-1 text-meta text-ink-subtle">
            <MapPin className="size-3.5 shrink-0" aria-hidden="true" />
            <span className="truncate">{L(AREA_MAP[rental.area].name)}</span>
          </p>

          {/* Spec row — tabular figures so the numbers line up between cards. */}
          <ul className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-meta font-medium text-ink-muted">
            {rental.bedrooms > 0 && (
              <li className="flex items-center gap-1.5">
                <BedDouble className="size-4 shrink-0 text-ink-subtle" aria-hidden="true" />
                <span className="tnum">
                  {n(rental.bedrooms)} {t(rental.bedrooms === 1 ? 'rentals.bed' : 'rentals.beds')}
                </span>
              </li>
            )}
            {rental.bathrooms > 0 && (
              <li className="flex items-center gap-1.5">
                <Bath className="size-4 shrink-0 text-ink-subtle" aria-hidden="true" />
                <span className="tnum">
                  {n(rental.bathrooms)}{' '}
                  {t(rental.bathrooms === 1 ? 'rentals.bath' : 'rentals.baths')}
                </span>
              </li>
            )}
            <li className="flex items-center gap-1.5">
              <Maximize className="size-4 shrink-0 text-ink-subtle" aria-hidden="true" />
              <span className="tnum">
                {n(rental.sizeSqft)} {t('rentals.sqft')}
              </span>
            </li>
            {rental.furnished && (
              <li className="flex items-center gap-1.5">
                <Sofa className="size-4 shrink-0 text-ink-subtle" aria-hidden="true" />
                {t('rentals.furnishedYes')}
              </li>
            )}
          </ul>

          <p className="mt-3 line-clamp-2 text-meta leading-relaxed text-pretty text-ink-muted">
            {L(rental.description)}
          </p>

          <div className="mt-4 flex items-center gap-2">
            <Badge variant="neutral" size="sm">
              {tenantLabel}
            </Badge>
            <CallButton
              phone={rental.phone}
              label={L(rental.title)}
              size="md"
              className="ml-auto"
            >
              {t('rentals.contact')}
            </CallButton>
          </div>
        </div>
      </div>
    </Card>
  )
}
