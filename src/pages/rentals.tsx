import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Building2 } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Slider } from '@/components/ui/slider'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Sheet,
  SheetBody,
  SheetCloseButton,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { RentalCard } from '@/components/cards/rental-card'
import { ListingsSection } from '@/components/listings/listings-section'
import { RentalDetailSheet } from '@/components/rentals/rental-detail-sheet'
import {
  RentalSearchBar,
  type RentalQuickFilters,
} from '@/components/rentals/rental-search-bar'
import { BusinessListSkeleton, EmptyState, ErrorState } from '@/components/feedback'
import { PageHeader } from '@/components/layout/page-header'
import { Section } from '@/components/layout/section'
import { CATEGORY_MAP, RENTAL_IDS } from '@/data/categories'
import { RENT_RANGE } from '@/data/rentals'
import type { CategoryId, Rental, TenantType } from '@/data/types'
import { useGeolocation } from '@/hooks/use-geolocation'
import { useRentals } from '@/hooks/use-queries'
import { formatBDT } from '@/lib/format'
import { useI18n } from '@/lib/i18n'
import { rentalTheme } from '@/lib/rental-theme'
import { cn } from '@/lib/utils'

/* ==========================================================================
 * Rentals.
 *
 * Arrangement follows Reference/Hostel: a segmented filter rail across the
 * top, a chip row with the result count on the left and sort on the right, and
 * a denser card grid below. The old 280px sidebar is gone — the rail holds the
 * four filters people reach for first, and the remaining three (budget, tenant,
 * furnishing) live in the sheet behind the rail's terminal button, so every
 * filter still has exactly one home.
 *
 * Colour is the project's own throughout. Category accents come from
 * rentalTheme(), which indexes the ART_PALETTE gradients that already drew
 * these cards.
 * ========================================================================== */

type Sort = 'recommended' | 'price-asc' | 'price-desc' | 'newest'

export default function RentalsPage() {
  const { t, L, n } = useI18n()
  const { origin } = useGeolocation()

  // Seeded from ?cat= so search can hand a rental query straight to this page.
  const [params] = useSearchParams()
  const seededCategory = (() => {
    const c = params.get('cat') as CategoryId | null
    return c && RENTAL_IDS.includes(c) ? c : null
  })()

  const [quick, setQuick] = useState<RentalQuickFilters>({
    category: seededCategory,
    bedrooms: null,
    bathrooms: null,
    area: null,
  })
  const [maxRent, setMaxRent] = useState<number>(RENT_RANGE.max)
  const [tenantType, setTenantType] = useState<TenantType | null>(null)
  const [furnishedOnly, setFurnishedOnly] = useState(false)
  const [sort, setSort] = useState<Sort>('recommended')

  const [sheetOpen, setSheetOpen] = useState(false)
  const [detail, setDetail] = useState<Rental | null>(null)

  const query = useRentals({
    categories: quick.category ? [quick.category] : undefined,
    bedrooms: quick.bedrooms,
    bathrooms: quick.bathrooms,
    area: quick.area,
    maxRent,
    tenantType,
    furnishedOnly,
    origin,
    sort,
  })

  const results = query.data ?? []

  /** Only the filters that live behind the sheet — the rail shows its own. */
  const sheetCount =
    (maxRent < RENT_RANGE.max ? 1 : 0) + (tenantType ? 1 : 0) + (furnishedOnly ? 1 : 0)

  const totalCount =
    sheetCount +
    (quick.category ? 1 : 0) +
    (quick.bedrooms ? 1 : 0) +
    (quick.bathrooms ? 1 : 0) +
    (quick.area ? 1 : 0)

  function reset() {
    setQuick({ category: null, bedrooms: null, bathrooms: null, area: null })
    setMaxRent(RENT_RANGE.max)
    setTenantType(null)
    setFurnishedOnly(false)
  }

  /** Quick category chips under the rail — the reference's filter tab row. */
  const categoryChips = useMemo(
    () =>
      RENTAL_IDS.map((id) => ({
        id,
        theme: rentalTheme(id as Rental['category']),
      })),
    [],
  )

  const sheetFilters = (
    <div className="space-y-7">
      {/* Budget */}
      <div>
        <div className="mb-1 flex items-baseline justify-between">
          <h3 className="text-micro uppercase text-ink-subtle">{t('rentals.budget')}</h3>
          <span className="tnum text-body-sm font-bold text-primary">
            {n(formatBDT(maxRent))}
            {maxRent >= RENT_RANGE.max && '+'}
          </span>
        </div>
        <Slider
          value={[maxRent]}
          min={RENT_RANGE.min}
          max={RENT_RANGE.max}
          step={500}
          onValueChange={([v]) => setMaxRent(v)}
          aria-label={t('rentals.budget')}
        />
        <div className="tnum flex justify-between text-meta text-ink-subtle">
          <span>{n(formatBDT(RENT_RANGE.min))}</span>
          <span>{n(formatBDT(RENT_RANGE.max))}+</span>
        </div>
      </div>

      {/* Tenant type */}
      <div>
        <h3 className="mb-3 text-micro uppercase text-ink-subtle">{t('rentals.tenant')}</h3>
        <div className="flex flex-wrap gap-2">
          {(
            [
              [null, t('rentals.any')],
              ['family', t('rentals.tenant.family')],
              ['bachelor', t('rentals.tenant.bachelor')],
            ] as const
          ).map(([value, label]) => (
            <button
              key={String(value)}
              type="button"
              onClick={() => setTenantType(value)}
              aria-pressed={tenantType === value}
              className={cn(
                'inline-flex h-11 items-center rounded-pill border px-4 text-meta font-semibold transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                tenantType === value
                  ? 'border-primary bg-primary text-white'
                  : 'border-line bg-surface text-ink-muted hover:bg-surface-2',
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* aria-label is required: Radix renders a <button>, which a wrapping
          <label> does not name the way it would a native input. */}
      <label className="flex min-h-tap cursor-pointer items-center gap-3">
        <Checkbox
          checked={furnishedOnly}
          onCheckedChange={(c) => setFurnishedOnly(Boolean(c))}
          aria-label={t('rentals.furnished')}
        />
        <span className="text-body-sm font-semibold">{t('rentals.furnished')}</span>
      </label>
    </div>
  )

  return (
    <>
      <PageHeader
        icon={<Building2 className="size-7" aria-hidden="true" />}
        title={t('rentals.title')}
        description={t('rentals.sub')}
      >
        <RentalSearchBar
          value={quick}
          onChange={setQuick}
          onOpenFilters={() => setSheetOpen(true)}
          activeCount={sheetCount}
          className="max-w-4xl"
        />
      </PageHeader>

      <Section>
        {/* ---- Category chips ----
            Each chip carries its category's own accent when selected, which is
            the same colour that card's artwork and hover stack use. */}
        <div className="rail rail-bleed sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0">
          <button
            type="button"
            onClick={() => setQuick({ ...quick, category: null })}
            aria-pressed={quick.category === null}
            className={cn(
              'inline-flex h-11 items-center rounded-pill border px-4 text-meta font-semibold transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-canvas',
              quick.category === null
                ? 'border-primary bg-primary text-white'
                : 'border-line bg-surface text-ink-muted hover:bg-surface-2',
            )}
          >
            {t('search.allCategories')}
          </button>

          {categoryChips.map(({ id, theme }) => {
            const active = quick.category === id
            return (
              <button
                key={id}
                type="button"
                onClick={() => setQuick({ ...quick, category: active ? null : id })}
                aria-pressed={active}
                className={cn(
                  'inline-flex h-11 items-center gap-1.5 rounded-pill border px-4 text-meta font-semibold transition-colors',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-canvas',
                  active
                    ? 'text-white'
                    : 'border-line bg-surface text-ink-muted hover:bg-surface-2',
                )}
                style={
                  active
                    ? { backgroundColor: theme.base, borderColor: theme.base }
                    : undefined
                }
              >
                <span aria-hidden="true">{CATEGORY_MAP[id].emoji}</span>
                {L(CATEGORY_MAP[id].name)}
              </button>
            )
          })}
        </div>

        {/* ---- Count + sort ---- */}
        <div className="mt-5 flex items-center justify-between gap-3">
          <p className="text-body-sm text-ink-muted" role="status" aria-live="polite">
            {query.isPending ? (
              t('state.loading')
            ) : (
              <>
                <span className="tnum font-bold text-ink">{n(results.length)}</span>{' '}
                {t(results.length === 1 ? 'search.result' : 'search.results')}
              </>
            )}
          </p>

          <div className="flex items-center gap-2">
            {totalCount > 0 && (
              <Button variant="ghost" size="sm" onClick={reset}>
                {t('search.reset')}
                <Badge variant="neutral" size="sm" className="tnum ml-1">
                  {n(totalCount)}
                </Badge>
              </Button>
            )}

            <Select value={sort} onValueChange={(v) => setSort(v as Sort)}>
              <SelectTrigger className="h-11 w-44 rounded-pill">
                <span className="truncate text-ink-subtle">{t('search.sort')}:</span>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="recommended">{t('search.sort.best')}</SelectItem>
                <SelectItem value="price-asc">{t('rentals.sortPriceAsc')}</SelectItem>
                <SelectItem value="price-desc">{t('rentals.sortPriceDesc')}</SelectItem>
                <SelectItem value="newest">{t('home.section.latest')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* ---- Grid ---- */}
        <div className="mt-4">
          {query.isError ? (
            <ErrorState onRetry={() => query.refetch()} />
          ) : query.isPending ? (
            <BusinessListSkeleton count={6} />
          ) : results.length === 0 ? (
            <EmptyState
              title={t('state.emptyTitle')}
              description={t('state.emptySub')}
              action={
                <Button variant="secondary" size="lg" onClick={reset}>
                  {t('search.reset')}
                </Button>
              }
            />
          ) : (
            /* The stacked hover layers travel 22px below each card, so the row
               gap has to clear them or the effect clips into the next row. */
            <div className="stack-fade grid gap-x-4 gap-y-9 sm:grid-cols-2 xl:grid-cols-3">
              {results.map((r, i) => (
                <RentalCard
                  key={r.rental.id}
                  rental={r.rental}
                  onOpen={setDetail}
                  className={i < 9 ? undefined : 'animate-none'}
                />
              ))}
            </div>
          )}

          {/* Published from the admin panel. Renders nothing until it has rows,
              so this page is unchanged until somebody adds one. */}
          <ListingsSection section="rentals" title="Listed rentals" />
        </div>
      </Section>

      {/* ---- Remaining filters ---- */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="bottom" className="max-h-[88dvh]">
          <SheetHeader>
            <SheetTitle>{t('search.filters')}</SheetTitle>
            <SheetCloseButton label={t('a11y.close')} />
          </SheetHeader>

          <SheetBody className="pb-4 pt-2">{sheetFilters}</SheetBody>

          <SheetFooter>
            <Button variant="secondary" size="lg" className="flex-1" onClick={reset}>
              {t('search.reset')}
            </Button>
            <Button size="lg" className="flex-[2]" onClick={() => setSheetOpen(false)}>
              {t('search.apply')}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* ---- Detail drawer ---- */}
      <RentalDetailSheet rental={detail} onOpenChange={(o) => !o && setDetail(null)} />
    </>
  )
}
