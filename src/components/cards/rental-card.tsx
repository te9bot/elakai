import { Bath, BedDouble, MapPin, Maximize, Sofa } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { ListingPhoto } from '@/components/listing-photo'
import { VerifiedBadge } from '@/components/status'
import { CATEGORY_MAP } from '@/data/categories'
import type { Rental } from '@/data/types'
import { formatBDT } from '@/lib/format'
import { useI18n } from '@/lib/i18n'
import { rentalTheme, withAlpha } from '@/lib/rental-theme'
import { cn } from '@/lib/utils'

/* ==========================================================================
 * Rental card.
 *
 * Composition follows Reference/Hostel: artwork on top with a badge in each
 * upper corner, then title, address, an outlined spec-chip row, and a price
 * line that leads — price is the field people compare on first.
 *
 * Colour does NOT follow the reference. Every value here resolves to the
 * project's own tokens (surface / line / ink / primary) or to the category's
 * entry in ART_PALETTE via rentalTheme(), which is the same palette that has
 * always drawn this card's artwork.
 * ========================================================================== */

/** One outlined spec pill — beds, baths, size, furnishing. */
function Spec({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <li className="inline-flex items-center gap-1.5 rounded-pill border border-line bg-surface px-2.5 py-1 text-meta font-medium text-ink-muted">
      <span className="shrink-0 text-ink-subtle">{icon}</span>
      {children}
    </li>
  )
}

export function RentalCard({
  rental,
  className,
  onOpen,
}: {
  rental: Rental
  className?: string
  onOpen?: (rental: Rental) => void
}) {
  const { t, L, n } = useI18n()
  const cat = CATEGORY_MAP[rental.category]
  const theme = rentalTheme(rental.category)

  const tenantLabel =
    rental.tenantType === 'family'
      ? t('rentals.tenant.family')
      : rental.tenantType === 'bachelor'
        ? t('rentals.tenant.bachelor')
        : t('rentals.tenant.any')

  return (
    /* `isolate` keeps the stacked layers from painting over neighbouring cards
       in the grid. The layers sit before the card in DOM order, so they stay
       behind it without anyone needing a z-index. */
    <article className={cn('group relative isolate', className)}>
      {/* ---- 3D stack ----------------------------------------------------
          Two shades of the card's own accent, revealed on hover and on
          keyboard focus. They are translucent tints of `theme.base`, not
          separate colours, so the effect reads as the card gaining depth
          rather than as a second palette appearing underneath it.

          Deliberately NOT behind `motion-safe:`. Reduced motion means no
          animation, not no depth — and the global rule in index.css already
          collapses every transition to 0.01ms, so these simply appear in
          place instead of sliding out. Gating them here removed the effect
          entirely for anyone with the OS setting on. */}
      <span
        aria-hidden="true"
        className={cn(
          'pointer-events-none absolute inset-x-9 bottom-0 h-16 rounded-card opacity-0',
          'transition-[transform,opacity] duration-300 ease-out',
          'group-hover:translate-y-[22px] group-hover:opacity-100',
          'group-focus-within:translate-y-[22px] group-focus-within:opacity-100',
        )}
        style={{ backgroundColor: withAlpha(theme.base, 0.32) }}
      />
      <span
        aria-hidden="true"
        className={cn(
          'pointer-events-none absolute inset-x-4 bottom-0 h-16 rounded-card opacity-0',
          'transition-[transform,opacity] duration-300 ease-out',
          'group-hover:translate-y-[11px] group-hover:opacity-100',
          'group-focus-within:translate-y-[11px] group-focus-within:opacity-100',
        )}
        style={{ backgroundColor: withAlpha(theme.base, 0.7) }}
      />

      <div
        className={cn(
          'list-perf relative overflow-hidden rounded-card border border-line bg-surface',
          'shadow-card transition-[box-shadow,transform,border-color] duration-300 ease-out',
          'motion-safe:group-hover:-translate-y-1',
          'group-focus-within:border-primary/40',
          // The hover glow is the same accent at low alpha, carried in on a
          // custom property so it stays one source of colour per card.
          'group-hover:shadow-[0_18px_40px_-14px_var(--rental-glow)]',
        )}
        style={{ '--rental-glow': withAlpha(theme.base, 0.45) } as React.CSSProperties}
      >
        {/* ---- Artwork ---- */}
        <div className="relative">
          <ListingPhoto
            src={rental.imageUrl}
            alt={L(rental.title)}
            seed={rental.imageSeed}
            icon={cat.icon}
            paletteIndex={theme.paletteIndex}
            rounded={false}
            className="h-44 w-full sm:h-48"
          />

          <div className="absolute left-3 top-3">
            <Badge variant="solid" size="sm">
              <span aria-hidden="true">{cat.emoji}</span>
              {L(cat.name)}
            </Badge>
          </div>

          {rental.verified && (
            <div className="absolute right-3 top-3">
              <VerifiedBadge />
            </div>
          )}
        </div>

        {/* ---- Body ---- */}
        <div className="p-4">
          <h3 className="text-body font-bold leading-snug text-balance">
            {onOpen ? (
              <button
                type="button"
                onClick={() => onOpen(rental)}
                className={cn(
                  'text-left transition-colors hover:text-primary',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface',
                  // Stretches the hit area over the whole card without nesting
                  // the spec chips or the contact button inside a button.
                  'after:absolute after:inset-0 after:content-[""]',
                )}
              >
                {L(rental.title)}
              </button>
            ) : (
              L(rental.title)
            )}
          </h3>

          <p className="mt-1 flex items-center gap-1 text-meta text-ink-subtle">
            <MapPin className="size-3.5 shrink-0" aria-hidden="true" />
            <span className="truncate">{L(rental.address)}</span>
          </p>

          {/* Spec row — tabular figures so numbers line up between cards. */}
          <ul className="mt-3 flex flex-wrap items-center gap-1.5">
            {rental.bedrooms > 0 && (
              <Spec icon={<BedDouble className="size-3.5" aria-hidden="true" />}>
                <span className="tnum">
                  {n(rental.bedrooms)} {t(rental.bedrooms === 1 ? 'rentals.bed' : 'rentals.beds')}
                </span>
              </Spec>
            )}
            {rental.bathrooms > 0 && (
              <Spec icon={<Bath className="size-3.5" aria-hidden="true" />}>
                <span className="tnum">
                  {n(rental.bathrooms)}{' '}
                  {t(rental.bathrooms === 1 ? 'rentals.bath' : 'rentals.baths')}
                </span>
              </Spec>
            )}
            <Spec icon={<Maximize className="size-3.5" aria-hidden="true" />}>
              <span className="tnum">
                {n(rental.sizeSqft)} {t('rentals.sqft')}
              </span>
            </Spec>
            {rental.furnished && (
              <Spec icon={<Sofa className="size-3.5" aria-hidden="true" />}>
                {t('rentals.furnishedYes')}
              </Spec>
            )}
          </ul>

          {/* ---- Price line ---- */}
          <div className="mt-4 flex items-end justify-between gap-3 border-t border-line pt-3.5">
            <p className="flex items-baseline gap-1">
              <span className="tnum text-title text-primary">{n(formatBDT(rental.rent))}</span>
              <span className="text-meta font-semibold text-ink-subtle">
                {t('rentals.perMonth')}
              </span>
            </p>

            <Badge variant="neutral" size="sm" className="shrink-0">
              {tenantLabel}
            </Badge>
          </div>
        </div>
      </div>
    </article>
  )
}
