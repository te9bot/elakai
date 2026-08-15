import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Building2, SearchX, SlidersHorizontal, X } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Sheet, SheetBody, SheetContent, SheetFooter, SheetHeader, SheetTitle, SheetCloseButton } from '@/components/ui/sheet'
import { SearchBar } from '@/components/search/search-bar'
import { BusinessCard } from '@/components/cards/business-card'
import { CategoryChip } from '@/components/cards/category-tile'
import { BusinessListSkeleton, EmptyState, ErrorState } from '@/components/feedback'
import { CATEGORIES, CATEGORY_MAP, HOME_CHIP_IDS } from '@/data/categories'
import type { CategoryId } from '@/data/types'
import { ListingCard } from '@/components/listings/listing-card'
import { useDebounce } from '@/hooks/use-debounce'
import { useGeolocation } from '@/hooks/use-geolocation'
import { useListings, useSearch } from '@/hooks/use-queries'
import { isFromBundledDirectory } from '@/lib/listing-identity'
import { matchListings } from '@/lib/listings'
import { SEARCH } from '@/lib/config'
import { useI18n } from '@/lib/i18n'
import { matchesRentalIntent, POPULAR_QUERIES } from '@/lib/search'
import { cn } from '@/lib/utils'

type Sort = 'best' | 'nearest' | 'rating' | 'open'

/**
 * All filter state lives in the URL, so a result list is shareable and the
 * browser's back button behaves the way people expect.
 */
export default function SearchPage() {
  const { t, L, n } = useI18n()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const { origin } = useGeolocation()

  const urlQuery = params.get('q') ?? ''
  const category = (params.get('cat') as CategoryId | null) ?? null
  const sort = (params.get('sort') as Sort | null) ?? 'best'
  const openOnly = params.get('open') === '1'
  const verifiedOnly = params.get('verified') === '1'

  const [input, setInput] = useState(urlQuery)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const debounced = useDebounce(input, SEARCH.debounceMs)

  // Keep the field in step when navigation changes the URL (back button, chips).
  useEffect(() => setInput(urlQuery), [urlQuery])

  // Reflect debounced typing back into the URL without stacking history entries.
  useEffect(() => {
    if (debounced === urlQuery) return
    const next = new URLSearchParams(params)
    if (debounced.trim()) next.set('q', debounced.trim())
    else next.delete('q')
    setParams(next, { replace: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced])

  const query = useSearch({
    query: debounced,
    category,
    origin,
    openOnly,
    verifiedOnly,
    sort,
    limit: SEARCH.maxResults,
  })

  // Admin-managed listings are a second corpus with a different shape, so they
  // are matched separately and shown as their own block rather than being
  // forced through a ranker built for `Business` records. See `matchListings`.
  //
  // Filtered to rows with no bundled counterpart, for the same reason the
  // admin-managed block on every other page is: `results` below already
  // contains the bundled directory, and the database holds an imported copy of
  // every one of those records. Without this the two corpora overlapped inside
  // one result set — 209 cards for 148 distinct places, with 60 titles listed
  // twice. Identity is the composite the importer dedupes on, so a record is
  // classified the same way here and there.
  const listingsQuery = useListings()
  const listingMatches = useMemo(
    () =>
      matchListings(listingsQuery.data ?? [], debounced, category).filter(
        (l) => !isFromBundledDirectory(l),
      ),
    [listingsQuery.data, debounced, category],
  )

  const results = query.data ?? []
  const totalResults = results.length + listingMatches.length
  const activeFilterCount = (openOnly ? 1 : 0) + (verifiedOnly ? 1 : 0) + (category ? 1 : 0)
  const hasSearch = debounced.trim().length > 0 || category !== null
  const rentalIntent = matchesRentalIntent(debounced)

  function patch(key: string, value: string | null) {
    const next = new URLSearchParams(params)
    if (value === null) next.delete(key)
    else next.set(key, value)
    setParams(next, { replace: true })
  }

  function resetFilters() {
    const next = new URLSearchParams()
    if (debounced.trim()) next.set('q', debounced.trim())
    setParams(next, { replace: true })
  }

  const sortLabels = useMemo<Record<Sort, string>>(
    () => ({
      best: t('search.sort.best'),
      nearest: t('search.sort.nearest'),
      rating: t('search.sort.rating'),
      open: t('search.sort.openFirst'),
    }),
    [t],
  )

  const filterControls = (
    <div className="space-y-6">
      <div>
        <h3 className="mb-3 text-micro uppercase text-ink-subtle">{t('search.sort')}</h3>
        <Select value={sort} onValueChange={(v) => patch('sort', v)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(sortLabels) as Sort[]).map((s) => (
              <SelectItem key={s} value={s}>
                {sortLabels[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Radix renders a <button>, which a wrapping <label> does NOT name the
          way it would a native input — hence the explicit aria-label. */}
      <div className="space-y-3">
        <label className="flex min-h-tap cursor-pointer items-center gap-3">
          <Checkbox
            checked={openOnly}
            onCheckedChange={(c) => patch('open', c ? '1' : null)}
            aria-label={t('search.openOnly')}
          />
          <span className="text-body-sm font-semibold">{t('search.openOnly')}</span>
        </label>

        <label className="flex min-h-tap cursor-pointer items-center gap-3">
          <Checkbox
            checked={verifiedOnly}
            onCheckedChange={(c) => patch('verified', c ? '1' : null)}
            aria-label={t('search.verifiedOnly')}
          />
          <span className="text-body-sm font-semibold">{t('search.verifiedOnly')}</span>
        </label>
      </div>

      <div>
        <h3 className="mb-3 text-micro uppercase text-ink-subtle">{t('search.allCategories')}</h3>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => patch('cat', null)}
            className={cn(
              'inline-flex h-10 items-center rounded-pill border px-3.5 text-meta font-semibold transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
              !category
                ? 'border-primary bg-primary text-white'
                : 'border-line bg-surface text-ink-muted hover:bg-surface-2',
            )}
          >
            {t('search.allCategories')}
          </button>

          {CATEGORIES.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => patch('cat', category === c.id ? null : c.id)}
              className={cn(
                'inline-flex h-10 items-center gap-1.5 rounded-pill border px-3.5 text-meta font-semibold transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                category === c.id
                  ? 'border-primary bg-primary text-white'
                  : 'border-line bg-surface text-ink-muted hover:bg-surface-2',
              )}
            >
              <span aria-hidden="true">{c.emoji}</span>
              {L(c.name)}
            </button>
          ))}
        </div>
      </div>
    </div>
  )

  return (
    <div className="container py-5 lg:py-8">
      {/* The search field is the page's real subject, so the h1 is visually
          hidden rather than duplicated as a redundant visible title. */}
      <h1 className="sr-only">{t('search.label')}</h1>

      {/* Sticky search — the bar must stay reachable while scrolling results. */}
      <div className="sticky top-16 z-30 -mx-4 bg-canvas/95 px-4 pb-3 pt-1 backdrop-blur-sm md:top-[72px] lg:static lg:mx-0 lg:bg-transparent lg:px-0 lg:pb-0 lg:backdrop-blur-none">
        <SearchBar
          value={input}
          onChange={setInput}
          onSubmit={(v) => patch('q', v.trim() || null)}
          autoFocus={!urlQuery && !category}
        />

        <div className="mt-3 flex items-center gap-2 lg:hidden">
          <Button variant="secondary" size="md" onClick={() => setFiltersOpen(true)}>
            <SlidersHorizontal />
            {t('search.filters')}
            {activeFilterCount > 0 && (
              <Badge variant="solid" size="sm" className="tnum ml-0.5">
                {n(activeFilterCount)}
              </Badge>
            )}
          </Button>

          {category && (
            <button
              type="button"
              onClick={() => patch('cat', null)}
              className="inline-flex h-12 items-center gap-1.5 rounded-pill border border-primary bg-primary px-3.5 text-meta font-semibold text-white"
            >
              <span aria-hidden="true">{CATEGORY_MAP[category].emoji}</span>
              {L(CATEGORY_MAP[category].name)}
              <X className="size-3.5" />
            </button>
          )}
        </div>
      </div>

      <div className="lg:grid lg:grid-cols-[260px_1fr] lg:gap-8">
        {/* Desktop sidebar filters */}
        <aside className="hidden lg:block">
          <div className="sticky top-28 rounded-card border border-line bg-surface p-5 shadow-card">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-heading">{t('search.filters')}</h2>
              {activeFilterCount > 0 && (
                <Button variant="ghost" size="sm" onClick={resetFilters}>
                  {t('search.reset')}
                </Button>
              )}
            </div>
            {filterControls}
          </div>
        </aside>

        <div className="mt-4 lg:mt-0">
          {/* Result count is announced politely so screen-reader users hear updates. */}
          <div className="mb-4 flex items-center justify-between gap-3">
            <p className="text-body-sm text-ink-muted" role="status" aria-live="polite">
              {query.isPending ? (
                t('state.loading')
              ) : (
                <>
                  <span className="tnum font-bold text-ink">{n(totalResults)}</span>{' '}
                  {t(totalResults === 1 ? 'search.result' : 'search.results')}
                  {debounced.trim() && (
                    <>
                      {' '}
                      · <span className="font-semibold text-ink">{debounced.trim()}</span>
                    </>
                  )}
                </>
              )}
            </p>

            <div className="hidden lg:block">
              <Select value={sort} onValueChange={(v) => patch('sort', v)}>
                <SelectTrigger className="h-10 w-44">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(sortLabels) as Sort[]).map((s) => (
                    <SelectItem key={s} value={s}>
                      {sortLabels[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Admin-managed listings first: they are the editorially curated set,
              and burying them under the bundled directory would make a freshly
              published listing look like it had not arrived. */}
          {listingMatches.length > 0 && (
            <div className="mb-6 grid gap-3 md:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
              {listingMatches.map((listing) => (
                <ListingCard key={listing.id} listing={listing} />
              ))}
            </div>
          )}

          {query.isError ? (
            <ErrorState onRetry={() => query.refetch()} />
          ) : query.isPending ? (
            <BusinessListSkeleton count={5} />
          ) : totalResults === 0 ? (
            hasSearch ? (
              <EmptyState
                icon={<SearchX className="size-6" />}
                title={t('search.noResults')}
                description={t('search.noResultsSub')}
                action={
                  <div className="flex flex-col items-center gap-4">
                    {/* Rentals live in a separate dataset, so a rental query
                        would otherwise dead-end here. */}
                    {rentalIntent && (
                      <Button asChild size="lg">
                        <Link to={`/rentals?cat=${rentalIntent}`}>
                          <Building2 />
                          {t('rentals.title')}
                        </Link>
                      </Button>
                    )}
                    <div className="flex flex-wrap justify-center gap-2">
                      {HOME_CHIP_IDS.slice(0, 4).map((id) => (
                        <CategoryChip key={id} id={id} />
                      ))}
                    </div>
                  </div>
                }
              />
            ) : (
              <EmptyState
                title={t('search.emptyTitle')}
                description={t('search.emptySub')}
                action={
                  <div className="flex flex-wrap justify-center gap-2">
                    {POPULAR_QUERIES.map((p) => (
                      <button
                        key={p.en}
                        type="button"
                        onClick={() => navigate(`/search?q=${encodeURIComponent(L(p))}`)}
                        className="inline-flex h-11 items-center rounded-pill border border-line bg-surface px-4 text-body-sm font-semibold shadow-card transition-colors hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      >
                        {L(p)}
                      </button>
                    ))}
                  </div>
                }
              />
            )
          ) : results.length === 0 ? null : (
            <div className="stack-fade grid gap-3 md:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
              {results.map((r, i) => (
                <BusinessCard
                  key={r.business.id}
                  result={r}
                  // Cap the stagger so a long list does not crawl in.
                  className={i < 8 ? undefined : 'animate-none'}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Mobile filter sheet */}
      <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
        <SheetContent side="bottom" className="max-h-[85dvh]">
          <SheetHeader>
            <SheetTitle>{t('search.filters')}</SheetTitle>
            <SheetCloseButton label={t('a11y.close')} />
          </SheetHeader>

          <SheetBody className="pb-4 pt-2">{filterControls}</SheetBody>

          <SheetFooter>
            <Button variant="secondary" size="lg" className="flex-1" onClick={resetFilters}>
              {t('search.reset')}
            </Button>
            <Button size="lg" className="flex-[2]" onClick={() => setFiltersOpen(false)}>
              {t('search.apply')}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  )
}
