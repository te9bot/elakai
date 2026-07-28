import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { BusinessCard } from '@/components/cards/business-card'
import { BusinessListSkeleton, EmptyState, ErrorState } from '@/components/feedback'
import { CATEGORY_MAP } from '@/data/categories'
import type { CategoryId } from '@/data/types'
import { useGeolocation } from '@/hooks/use-geolocation'
import { useCategoriesListings, useCategoryListings } from '@/hooks/use-queries'
import { useI18n } from '@/lib/i18n'

/**
 * Shared tabbed browser behind the Healthcare and Services pages. Both are the
 * same interaction — pick a category, get a ranked list — so they share one
 * implementation rather than two near-identical pages.
 */
export function CategoryBrowser({ categoryIds }: { categoryIds: CategoryId[] }) {
  const { t, L, n } = useI18n()
  const { origin } = useGeolocation()
  const [active, setActive] = useState<'all' | CategoryId>('all')

  const all = useCategoriesListings(categoryIds, origin)
  const single = useCategoryListings(
    active === 'all' ? categoryIds[0] : active,
    origin,
  )

  const query = active === 'all' ? all : single
  const results = query.data ?? []

  return (
    <Tabs value={active} onValueChange={(v) => setActive(v as 'all' | CategoryId)}>
      <TabsList aria-label={t('search.allCategories')}>
        <TabsTrigger value="all">{t('search.allCategories')}</TabsTrigger>
        {categoryIds.map((id) => (
          <TabsTrigger key={id} value={id}>
            <span aria-hidden="true">{CATEGORY_MAP[id].emoji}</span>
            {L(CATEGORY_MAP[id].name)}
          </TabsTrigger>
        ))}
      </TabsList>

      <TabsContent value={active} className="mt-6">
        <p className="mb-4 text-body-sm text-ink-muted" role="status" aria-live="polite">
          {query.isPending ? (
            t('state.loading')
          ) : (
            <>
              <span className="tnum font-bold text-ink">{n(results.length)}</span>{' '}
              {t(results.length === 1 ? 'search.result' : 'search.results')}
            </>
          )}
        </p>

        {query.isError ? (
          <ErrorState onRetry={() => query.refetch()} />
        ) : query.isPending ? (
          <BusinessListSkeleton count={4} />
        ) : results.length === 0 ? (
          <EmptyState title={t('state.emptyTitle')} description={t('state.emptySub')} />
        ) : (
          <div className="stack-fade grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {results.map((r, i) => (
              <BusinessCard
                key={r.business.id}
                result={r}
                className={i < 9 ? undefined : 'animate-none'}
              />
            ))}
          </div>
        )}
      </TabsContent>
    </Tabs>
  )
}
