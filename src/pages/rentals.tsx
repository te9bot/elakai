import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Building2, SlidersHorizontal } from 'lucide-react'

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
import { BusinessListSkeleton, EmptyState, ErrorState } from '@/components/feedback'
import { PageHeader } from '@/components/layout/page-header'
import { Section } from '@/components/layout/section'
import { AREAS, CATEGORY_MAP, RENTAL_IDS } from '@/data/categories'
import { RENT_RANGE } from '@/data/rentals'
import type { CategoryId, TenantType } from '@/data/types'
import { useGeolocation } from '@/hooks/use-geolocation'
import { useRentals } from '@/hooks/use-queries'
import { formatBDT } from '@/lib/format'
import { useI18n } from '@/lib/i18n'
import { cn } from '@/lib/utils'

export default function RentalsPage() {
  const { t, L, n } = useI18n()
  const { origin } = useGeolocation()

  // Seeded from ?cat= so search can hand a rental query straight to this page.
  const [params] = useSearchParams()
  const [categories, setCategories] = useState<CategoryId[]>(() => {
    const c = params.get('cat') as CategoryId | null
    return c && RENTAL_IDS.includes(c) ? [c] : []
  })
  const [maxRent, setMaxRent] = useState<number>(RENT_RANGE.max)
  const [bedrooms, setBedrooms] = useState<number | null>(null)
  const [tenantType, setTenantType] = useState<TenantType | null>(null)
  const [furnishedOnly, setFurnishedOnly] = useState(false)
  const [area, setArea] = useState<string | null>(null)
  const [sort, setSort] = useState<'recommended' | 'price-asc' | 'price-desc' | 'newest'>(
    'recommended',
  )
  const [sheetOpen, setSheetOpen] = useState(false)

  const query = useRentals({
    categories: categories.length ? categories : undefined,
    maxRent,
    bedrooms,
    tenantType,
    furnishedOnly,
    area,
    origin,
    sort,
  })

  const results = query.data ?? []
  const activeCount =
    categories.length +
    (maxRent < RENT_RANGE.max ? 1 : 0) +
    (bedrooms ? 1 : 0) +
    (tenantType ? 1 : 0) +
    (furnishedOnly ? 1 : 0) +
    (area ? 1 : 0)

  function reset() {
    setCategories([])
    setMaxRent(RENT_RANGE.max)
    setBedrooms(null)
    setTenantType(null)
    setFurnishedOnly(false)
    setArea(null)
  }

  function toggleCategory(id: CategoryId) {
    setCategories((prev) => (prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]))
  }

  const filters = (
    <div className="space-y-7">
      {/* Property type */}
      <div>
        <h3 className="mb-3 text-micro uppercase text-ink-subtle">{t('search.allCategories')}</h3>
        <div className="flex flex-wrap gap-2">
          {RENTAL_IDS.map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => toggleCategory(id)}
              aria-pressed={categories.includes(id)}
              className={cn(
                'inline-flex h-11 items-center gap-1.5 rounded-pill border px-4 text-meta font-semibold transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                categories.includes(id)
                  ? 'border-primary bg-primary text-white'
                  : 'border-line bg-surface text-ink-muted hover:bg-surface-2',
              )}
            >
              <span aria-hidden="true">{CATEGORY_MAP[id].emoji}</span>
              {L(CATEGORY_MAP[id].name)}
            </button>
          ))}
        </div>
      </div>

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

      {/* Bedrooms */}
      <div>
        <h3 className="mb-3 text-micro uppercase text-ink-subtle">{t('rentals.bedrooms')}</h3>
        <div className="flex flex-wrap gap-2">
          {[null, 1, 2, 3, 4].map((b) => (
            <button
              key={String(b)}
              type="button"
              onClick={() => setBedrooms(b)}
              aria-pressed={bedrooms === b}
              className={cn(
                'inline-flex h-11 min-w-11 items-center justify-center rounded-pill border px-4 text-meta font-semibold transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                bedrooms === b
                  ? 'border-primary bg-primary text-white'
                  : 'border-line bg-surface text-ink-muted hover:bg-surface-2',
              )}
            >
              {b === null ? t('rentals.anyBedrooms') : <span className="tnum">{n(b)}+</span>}
            </button>
          ))}
        </div>
      </div>

      {/* Tenant type */}
      <div>
        <h3 className="mb-3 text-micro uppercase text-ink-subtle">{t('rentals.tenant')}</h3>
        <div className="flex flex-wrap gap-2">
          {(
            [
              [null, t('rentals.anyBedrooms')],
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

      {/* Area */}
      <div>
        <h3 className="mb-3 text-micro uppercase text-ink-subtle">{t('rentals.area')}</h3>
        <Select value={area ?? 'all'} onValueChange={(v) => setArea(v === 'all' ? null : v)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('search.allCategories')}</SelectItem>
            {AREAS.map((a) => (
              <SelectItem key={a.id} value={a.id}>
                {L(a.name)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
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
      />

      <Section>
        <div className="lg:grid lg:grid-cols-[280px_1fr] lg:gap-8">
          <aside className="hidden lg:block">
            <div className="sticky top-28 rounded-card border border-line bg-surface p-5 shadow-card">
              <div className="mb-5 flex items-center justify-between">
                <h2 className="text-heading">{t('search.filters')}</h2>
                {activeCount > 0 && (
                  <Button variant="ghost" size="sm" onClick={reset}>
                    {t('search.reset')}
                  </Button>
                )}
              </div>
              {filters}
            </div>
          </aside>

          <div>
            <div className="mb-4 flex items-center justify-between gap-3">
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
                <Button
                  variant="secondary"
                  size="md"
                  className="lg:hidden"
                  onClick={() => setSheetOpen(true)}
                >
                  <SlidersHorizontal />
                  {t('search.filters')}
                  {activeCount > 0 && (
                    <Badge variant="solid" size="sm" className="tnum ml-0.5">
                      {n(activeCount)}
                    </Badge>
                  )}
                </Button>

                <Select value={sort} onValueChange={(v) => setSort(v as typeof sort)}>
                  <SelectTrigger className="h-12 w-40 lg:h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="recommended">{t('search.sort.best')}</SelectItem>
                    <SelectItem value="price-asc">{t('rentals.budget')} ↑</SelectItem>
                    <SelectItem value="price-desc">{t('rentals.budget')} ↓</SelectItem>
                    <SelectItem value="newest">{t('home.section.latest')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {query.isError ? (
              <ErrorState onRetry={() => query.refetch()} />
            ) : query.isPending ? (
              <BusinessListSkeleton count={4} />
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
              <div className="stack-fade grid gap-3 xl:grid-cols-2">
                {results.map((r, i) => (
                  <RentalCard
                    key={r.rental.id}
                    rental={r.rental}
                    className={i < 8 ? undefined : 'animate-none'}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </Section>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="bottom" className="max-h-[88dvh]">
          <SheetHeader>
            <SheetTitle>{t('search.filters')}</SheetTitle>
            <SheetCloseButton label={t('a11y.close')} />
          </SheetHeader>

          <SheetBody className="pb-4 pt-2">{filters}</SheetBody>

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
    </>
  )
}
