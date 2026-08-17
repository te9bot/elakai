import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Stethoscope } from 'lucide-react'

import { SearchBar } from '@/components/search/search-bar'
import { EmptyState, ErrorState } from '@/components/feedback'
import { BrandLoader } from '@/components/brand-loader'
import { Icon } from '@/components/icon'
import { PageHeader } from '@/components/layout/page-header'
import { Section } from '@/components/layout/section'
import { HealthResultCard } from '@/components/healthcare/health-cards'
import { HealthcareFilters } from '@/components/healthcare/health-filters'
import { ListingsSection } from '@/components/listings/listings-section'
import { CATEGORY_MAP } from '@/data/categories'
import { HEALTH_CATEGORY_IDS } from '@/data/healthcare'
import type { HealthCategoryId } from '@/data/healthcare-types'
import type { AreaId } from '@/data/types'
import { useDebounce } from '@/hooks/use-debounce'
import { useHealthcare } from '@/hooks/use-queries'
import {
  categoryCounts,
  featuredHealthcare,
  healthcareCounts,
  matchesHealthFilters,
  searchHealthcare,
  type HealthFilters,
} from '@/lib/healthcare-search'
import { useI18n } from '@/lib/i18n'
import { cn } from '@/lib/utils'

/* ==========================================================================
 * Healthcare — a searchable directory, not a card wall.
 *
 * The landing state is deliberately quiet: a search box, six category buttons,
 * and a handful of featured entries. The full dataset exists behind it and only
 * surfaces once the user has said something about what they want — a query, a
 * category, or a filter. Showing every record up front is what made this
 * section unreadable.
 *
 * State lives in the URL so a result list survives opening a profile and coming
 * back, and so a search can be shared as a link.
 * ========================================================================== */

function isHealthCategory(v: string | null): v is HealthCategoryId {
  return v !== null && (HEALTH_CATEGORY_IDS as string[]).includes(v)
}

export default function HealthcarePage() {
  const { t, L, n } = useI18n()
  const [params, setParams] = useSearchParams()

  // Loads the directory into lib/healthcare-search.ts. Every lookup below is
  // synchronous and reads that corpus, so they are all keyed on `corpusAt` —
  // otherwise a memo computed against the bundled data would never recompute
  // once the live records replaced it.
  const healthcare = useHealthcare()
  const corpusAt = healthcare.dataUpdatedAt

  const category = isHealthCategory(params.get('cat')) ? (params.get('cat') as HealthCategoryId) : null
  const urlQuery = params.get('q') ?? ''

  // The input is local so typing never waits on a router update; the URL
  // catches up on the debounce, which is also what the result scan runs on.
  const [input, setInput] = useState(urlQuery)
  const query = useDebounce(input, 120)

  const filters: HealthFilters = useMemo(
    () => ({
      area: (params.get('area') as AreaId | null) || null,
      specialty: params.get('spec') || null,
      service: params.get('svc') || null,
    }),
    [params],
  )

  const patch = useCallback(
    (next: Record<string, string | null>) => {
      setParams(
        (prev) => {
          const out = new URLSearchParams(prev)
          for (const [k, v] of Object.entries(next)) {
            if (v) out.set(k, v)
            else out.delete(k)
          }
          return out
        },
        { replace: true },
      )
    },
    [setParams],
  )

  const setCategory = useCallback(
    (id: HealthCategoryId) => {
      // Tapping the active category clears it. Filters are category-specific,
      // so they are dropped rather than silently applied to a different set.
      patch({
        cat: category === id ? null : id,
        spec: null,
        svc: null,
      })
    },
    [category, patch],
  )

  const setFilters = useCallback(
    (next: HealthFilters) =>
      patch({
        area: next.area ?? null,
        spec: next.specialty ?? null,
        svc: next.service ?? null,
      }),
    [patch],
  )

  // The URL trails the input by one debounce rather than leading it, so a
  // returning user gets their result list back without every keystroke costing
  // a history entry.
  useEffect(() => {
    const next = query.trim()
    if (next === urlQuery) return
    patch({ q: next || null })
  }, [query, urlQuery, patch])

  const hasFilters = Boolean(filters.area || filters.specialty || filters.service)
  const isBrowsing = Boolean(query.trim() || category || hasFilters)

  // Two passes: the query result, then the filters over it. Splitting them lets
  // the filter chips count what the query actually returned instead of the
  // whole category, and keeps a chip from vanishing the moment it is selected.
  const candidates = useMemo(
    () => (isBrowsing ? searchHealthcare({ query, category }) : []),
    [isBrowsing, query, category, corpusAt],
  )

  const results = useMemo(
    () => candidates.filter((r) => matchesHealthFilters(r.record, filters)),
    [candidates, filters],
  )

  const candidateRecords = useMemo(() => candidates.map((r) => r.record), [candidates])

  const featured = useMemo(() => featuredHealthcare(6), [corpusAt])
  const counts = useMemo(() => healthcareCounts(), [corpusAt])
  const categoryTotals = useMemo(() => categoryCounts(), [corpusAt])

  function submit(v: string) {
    patch({ q: v.trim() || null })
  }

  function clear() {
    setInput('')
    patch({ q: null })
  }

  return (
    <>
      <PageHeader
        icon={<Stethoscope className="size-7" aria-hidden="true" />}
        title={t('health.title')}
        description={t('health.sub')}
      >
        {/* The search box is the section's primary control, so it sits in the
            header rather than below the fold. */}
        <div className="max-w-2xl">
          <SearchBar
            value={input}
            onChange={setInput}
            onSubmit={submit}
            onClear={clear}
            placeholder={t('health.searchPlaceholder')}
            size="lg"
            className="shadow-lift"
          />
          <p className="mt-3 text-meta text-ink-subtle">
            <span className="tnum font-bold text-ink-muted">{n(counts.facilities)}</span>{' '}
            {t('health.stat.facilities')}
            <span className="px-2 text-ink-subtle/50" aria-hidden="true">
              ·
            </span>
            <span className="tnum font-bold text-ink-muted">{n(counts.doctors)}</span>{' '}
            {t('health.stat.doctors')}
          </p>
        </div>
      </PageHeader>

      <Section>
        {/* ---------------- Categories ---------------- */}
        <h2 className="mb-3 text-heading">{t('health.categories')}</h2>

        {/* Scrolls sideways on a phone rather than wrapping to three rows and
            pushing the results off the screen; wraps normally from sm up. */}
        <div
          role="group"
          aria-label={t('health.categories')}
          className="rail rail-bleed sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0"
        >
          {HEALTH_CATEGORY_IDS.map((id) => {
            const cat = CATEGORY_MAP[id]
            const active = category === id
            return (
              <button
                key={id}
                type="button"
                onClick={() => setCategory(id)}
                aria-pressed={active}
                className={cn(
                  'inline-flex h-12 items-center gap-2 rounded-pill border px-4 text-body-sm font-semibold',
                  'shadow-card transition-[transform,box-shadow,border-color,background-color] duration-150 ease-out',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-canvas',
                  active
                    ? 'border-primary bg-primary text-white'
                    : 'border-line bg-surface text-ink hover:border-primary/40 hover:shadow-card-hover hover:-translate-y-0.5',
                )}
              >
                <span className="text-[17px] leading-none" aria-hidden="true">
                  {cat.emoji}
                </span>
                {L(cat.name)}
                <span
                  className={cn('tnum text-meta', active ? 'text-white/75' : 'text-ink-subtle')}
                >
                  {n(categoryTotals[id] ?? 0)}
                </span>
              </button>
            )
          })}
        </div>

        {/* ---------------- Results ----------------
            Gated on the corpus rather than rendered stale: this directory is
            the reason someone calls a number, and showing a record that has
            since been unpublished is worse than showing a brief wait. The
            header and search box stay up so the page never looks empty. */}
        {healthcare.isPending ? (
          <BrandLoader className="min-h-[40vh]" />
        ) : healthcare.isError ? (
          <div className="mt-6">
            <ErrorState onRetry={() => healthcare.refetch()} />
          </div>
        ) : isBrowsing ? (
          <div className="mt-6 space-y-5">
            <HealthcareFilters
              category={category}
              candidates={candidateRecords}
              filters={filters}
              onChange={setFilters}
            />

            <p className="text-body-sm text-ink-muted" role="status" aria-live="polite">
              <span className="tnum font-bold text-ink">{n(results.length)}</span>{' '}
              {t(results.length === 1 ? 'search.result' : 'search.results')}
              {category && (
                <>
                  {' · '}
                  {L(CATEGORY_MAP[category].name)}
                </>
              )}
              {query.trim() && (
                <>
                  {' · '}
                  <span className="font-semibold text-ink">“{query.trim()}”</span>
                </>
              )}
            </p>

            {results.length === 0 ? (
              <EmptyState
                title={t('health.emptyTitle')}
                description={t('health.emptySub')}
                icon={<Icon name="stethoscope" className="size-6" />}
              />
            ) : (
              <div className="stack-fade grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {results.map((r, i) => (
                  <div key={r.record.id} className={i < 9 ? undefined : 'animate-none'}>
                    <HealthResultCard record={r.record} />
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* ---------------- Landing ---------------- */
          <div className="mt-8">
            <h2 className="text-heading">{t('health.featured')}</h2>
            <p className="mt-1 text-body-sm text-ink-muted">{t('health.featuredSub')}</p>

            <div className="stack-fade mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {featured.map((record) => (
                <HealthResultCard key={record.id} record={record} />
              ))}
            </div>

            <p className="mt-6 text-body-sm text-pretty text-ink-muted">{t('health.hint')}</p>

            {/* Published from the admin panel. Renders nothing until it has
                rows, so this page is unchanged until somebody adds one. Kept on
                the landing branch only: the search branch above is showing
                results for a query these rows are not indexed against. */}
            <ListingsSection
              section="healthcare"
              title="Listed healthcare"
              description="Added by the ELAKAI team."
            />
          </div>
        )}
      </Section>
    </>
  )
}
