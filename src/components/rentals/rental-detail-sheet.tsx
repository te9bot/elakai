import { Bath, BedDouble, CalendarDays, Layers, MapPin, Maximize, Sofa } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import {
  Sheet,
  SheetBody,
  SheetCloseButton,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { CallButton } from '@/components/call-button'
import { ListingArt } from '@/components/listing-art'
import { VerifiedBadge } from '@/components/status'
import { AREA_MAP, CATEGORY_MAP } from '@/data/categories'
import type { Rental } from '@/data/types'
import { useIsDesktop } from '@/hooks/use-media-query'
import { formatBDT } from '@/lib/format'
import { DirectionsButton } from '@/components/directions-button'
import { useI18n } from '@/lib/i18n'
import { rentalTheme } from '@/lib/rental-theme'

/* ==========================================================================
 * Rental detail drawer.
 *
 * The card is a summary; this is where the full listing lives — description,
 * every spec, floor, availability, address and the contact action. It reuses
 * the existing Sheet primitive, so its surface, radius, overlay and motion are
 * the ones the rest of the app already uses.
 * ========================================================================== */

function SpecRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: React.ReactNode
}) {
  return (
    <div className="flex items-start gap-3 rounded-control border border-line bg-surface px-3.5 py-3">
      <span className="mt-0.5 shrink-0 text-ink-subtle">{icon}</span>
      <div className="min-w-0">
        <dt className="text-meta font-semibold text-ink-subtle">{label}</dt>
        <dd className="text-body-sm font-bold">{value}</dd>
      </div>
    </div>
  )
}

export function RentalDetailSheet({
  rental,
  onOpenChange,
}: {
  rental: Rental | null
  onOpenChange: (open: boolean) => void
}) {
  const { t, L, n } = useI18n()
  // Both hooks must run before the null guard below — the component is
  // remounted with a rental and back to null as the drawer opens and closes.
  const isDesktop = useIsDesktop()

  // Radix unmounts the content when closed, so the null guard below only ever
  // affects the frame in which the drawer is already closing.
  if (!rental) return <Sheet open={false} onOpenChange={onOpenChange} />

  const cat = CATEGORY_MAP[rental.category]
  const theme = rentalTheme(rental.category)
  const area = AREA_MAP[rental.area]

  const tenantLabel =
    rental.tenantType === 'family'
      ? t('rentals.tenant.family')
      : rental.tenantType === 'bachelor'
        ? t('rentals.tenant.bachelor')
        : t('rentals.tenant.any')

  return (
    <Sheet open onOpenChange={onOpenChange}>
      {/* Bottom on phones (thumb reach), right-hand drawer from lg where there
          is room beside the grid. Switching the `side` prop rather than
          overriding classes keeps the slide direction and the drag handle
          correct for each form. */}
      <SheetContent
        side={isDesktop ? 'right' : 'bottom'}
        className={isDesktop ? 'w-[min(30rem,92vw)]' : 'max-h-[92dvh]'}
      >
        <SheetHeader>
          <SheetTitle className="min-w-0 truncate">{L(rental.title)}</SheetTitle>
          <SheetCloseButton label={t('a11y.close')} />
        </SheetHeader>

        <SheetBody>
          <div className="relative overflow-hidden rounded-card">
            <ListingArt
              seed={rental.imageSeed}
              icon={cat.icon}
              paletteIndex={theme.paletteIndex}
              rounded={false}
              className="h-44 w-full sm:h-52"
            />
            <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
              <Badge variant="solid" size="sm">
                <span aria-hidden="true">{cat.emoji}</span>
                {L(cat.name)}
              </Badge>
              {rental.verified && <VerifiedBadge />}
            </div>
          </div>

          <p className="mt-4 flex items-baseline gap-1.5">
            <span className="tnum text-display text-primary">{n(formatBDT(rental.rent))}</span>
            <span className="text-body-sm font-semibold text-ink-subtle">
              {t('rentals.perMonth')}
            </span>
          </p>

          <p className="mt-2 flex items-start gap-1.5 text-body-sm text-ink-muted">
            <MapPin className="mt-0.5 size-4 shrink-0 text-ink-subtle" aria-hidden="true" />
            <span className="text-pretty">{L(rental.address)}</span>
          </p>

          <p className="mt-4 text-body-sm leading-relaxed text-pretty text-ink-muted">
            {L(rental.description)}
          </p>

          <dl className="mt-5 grid grid-cols-2 gap-2">
            {rental.bedrooms > 0 && (
              <SpecRow
                icon={<BedDouble className="size-4" aria-hidden="true" />}
                label={t(rental.bedrooms === 1 ? 'rentals.bed' : 'rentals.beds')}
                value={<span className="tnum">{n(rental.bedrooms)}</span>}
              />
            )}
            {rental.bathrooms > 0 && (
              <SpecRow
                icon={<Bath className="size-4" aria-hidden="true" />}
                label={t(rental.bathrooms === 1 ? 'rentals.bath' : 'rentals.baths')}
                value={<span className="tnum">{n(rental.bathrooms)}</span>}
              />
            )}
            <SpecRow
              icon={<Maximize className="size-4" aria-hidden="true" />}
              label={t('rentals.sqft')}
              value={<span className="tnum">{n(rental.sizeSqft)}</span>}
            />
            <SpecRow
              icon={<Sofa className="size-4" aria-hidden="true" />}
              label={t('rentals.tenant')}
              value={tenantLabel}
            />
            {rental.floor !== undefined && (
              <SpecRow
                icon={<Layers className="size-4" aria-hidden="true" />}
                label={t('rentals.floor')}
                value={<span className="tnum">{n(rental.floor)}</span>}
              />
            )}
            <SpecRow
              icon={<CalendarDays className="size-4" aria-hidden="true" />}
              label={t('rentals.availableFrom')}
              value={<span className="tnum">{n(rental.availableFrom)}</span>}
            />
          </dl>

          <div className="mt-4 flex flex-wrap items-center gap-2 text-meta text-ink-subtle">
            <MapPin className="size-3.5" aria-hidden="true" />
            {L(area.name)}
            <span aria-hidden="true">·</span>
            {rental.furnished ? t('rentals.furnishedYes') : t('rentals.furnishedNo')}
          </div>

          <DirectionsButton
            coords={rental.coords}
            coordsApprox={rental.coordsApprox}
            address={L(rental.address)}
            label={L(rental.title)}
            size="lg"
            block
            className="mt-4"
          />
        </SheetBody>

        <SheetFooter>
          <CallButton phone={rental.phone} label={L(rental.title)} size="lg" block>
            {t('rentals.contact')}
          </CallButton>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
