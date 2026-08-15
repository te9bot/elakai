import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import * as api from '@/lib/api'
import type { RentalFilters } from '@/lib/api'
import { FALLBACK_COVERAGE } from '@/data/coverage'
import type { SearchOptions } from '@/lib/search'
import { listingKey } from '@/lib/listings-import'
import type { CategoryId, LatLng } from '@/data/types'

/**
 * Query keys are namespaced so a future real backend can invalidate coherently.
 * Data is effectively static in demo mode, hence the long stale times.
 */
export const keys = {
  search: (o: SearchOptions) => ['search', o] as const,
  business: (slug: string) => ['business', slug] as const,
  category: (c: CategoryId, o?: LatLng) => ['category', c, o] as const,
  categories: (c: CategoryId[], o?: LatLng) => ['categories', c, o] as const,
  popular: (o?: LatLng) => ['popular', o] as const,
  latest: (o?: LatLng) => ['latest', o] as const,
  related: (id: string) => ['related', id] as const,
  emergency: () => ['emergency'] as const,
  rentals: (f: RentalFilters) => ['rentals', f] as const,
  stats: () => ['stats'] as const,
  healthcare: () => ['healthcare'] as const,
  coverage: () => ['coverage'] as const,
  listings: (section?: string) => ['listings', section ?? 'all'] as const,
  // Nested under the same root as the list, so invalidating 'listings' after an
  // admin save refreshes an open detail page too rather than leaving it stale.
  listing: (id: string) => ['listings', 'detail', id] as const,
}

const STALE = 5 * 60 * 1000

export function useSearch(options: SearchOptions, enabled = true) {
  return useQuery({
    queryKey: keys.search(options),
    queryFn: () => api.searchBusinesses(options),
    enabled,
    staleTime: STALE,
    // Keeps the previous list on screen while a new query resolves, so the
    // results area never flashes empty between keystrokes.
    placeholderData: (prev) => prev,
  })
}

export function useBusiness(slug: string | undefined) {
  return useQuery({
    queryKey: keys.business(slug ?? ''),
    queryFn: () => api.getBusinessBySlug(slug!),
    enabled: Boolean(slug),
    staleTime: STALE,
  })
}

export function useCategoryListings(category: CategoryId, origin?: LatLng, limit?: number) {
  return useQuery({
    queryKey: keys.category(category, origin),
    queryFn: () => api.listByCategory(category, origin, limit),
    staleTime: STALE,
  })
}

export function useCategoriesListings(categories: CategoryId[], origin?: LatLng, limit?: number) {
  return useQuery({
    queryKey: keys.categories(categories, origin),
    queryFn: () => api.listByCategories(categories, origin, limit),
    staleTime: STALE,
  })
}

export function usePopular(origin?: LatLng, limit?: number) {
  return useQuery({
    queryKey: keys.popular(origin),
    queryFn: () => api.listPopular(origin, limit),
    staleTime: STALE,
  })
}

export function useLatestVerified(origin?: LatLng, limit?: number) {
  return useQuery({
    queryKey: keys.latest(origin),
    queryFn: () => api.listLatestVerified(origin, limit),
    staleTime: STALE,
  })
}

export function useRelated(business: Parameters<typeof api.listRelated>[0] | undefined) {
  return useQuery({
    queryKey: keys.related(business?.id ?? ''),
    queryFn: () => api.listRelated(business!),
    enabled: Boolean(business),
    staleTime: STALE,
  })
}

export function useEmergency() {
  return useQuery({
    queryKey: keys.emergency(),
    queryFn: api.listEmergency,
    staleTime: Infinity,
  })
}

/**
 * Directory counts for the hero stat line.
 *
 * Seeded with the bundled counts so the line renders a real number on first
 * paint — the hero is the LCP area, and holding it back for a COUNT round trip
 * to animate three numbers is not a trade worth making. It reconciles to the
 * live figures when they arrive.
 */
export function useStats() {
  return useQuery({
    queryKey: keys.stats(),
    queryFn: api.fetchStats,
    staleTime: STALE,
    initialData: api.countBusinessesSync,
  })
}

/**
 * Loads the healthcare corpus into `lib/healthcare-search.ts`.
 *
 * The search, filter and lookup functions in that module are synchronous by
 * design — they run on every keystroke — so pages await this once and then call
 * them freely. Gate a healthcare screen on `isPending` before rendering
 * results, or it will render the previous corpus.
 */
export function useHealthcare() {
  return useQuery({
    queryKey: keys.healthcare(),
    queryFn: api.loadHealthcare,
    staleTime: STALE,
  })
}

/**
 * What the two homepage bands cover — see `data/coverage.ts`.
 *
 * Seeded with the bundled lists so the hero strip is populated on first paint,
 * then reconciled to whatever the resolver returns. The bands re-measure
 * themselves when the answer differs, so a longer list, a shorter one, or a
 * completely different one all arrive without a jump: the loop distance is read
 * off the DOM after the new items render, never carried over from the old ones.
 */
export function useCoverage() {
  return useQuery({
    queryKey: keys.coverage(),
    queryFn: api.loadCoverage,
    staleTime: STALE,
    initialData: FALLBACK_COVERAGE,
  })
}

/**
 * Active listings for one section of the site.
 *
 * Unlike the bundled directory, this content changes whenever an admin saves,
 * so it carries a much shorter stale time and refetches when the tab is
 * brought back to the foreground. That is what makes "publish in the admin
 * panel, reload the site, see it" hold without a deploy.
 */
export function useListings(section?: string) {
  return useQuery({
    queryKey: keys.listings(section),
    queryFn: () => api.listActiveListings(section),
    staleTime: 30 * 1000,
    refetchOnWindowFocus: true,
  })
}

/**
 * One admin-published listing, for `/listing/:id`.
 *
 * `retry: false` because the two failure modes want opposite handling: a
 * genuinely missing row resolves to null (not an error) and should render the
 * not-found state immediately, while retrying a bad id just delays that by a
 * round trip. Real transport errors still surface through `isError`.
 */
export function useListing(id: string | undefined) {
  return useQuery({
    queryKey: keys.listing(id ?? ''),
    queryFn: () => api.getListingById(id!),
    enabled: Boolean(id),
    staleTime: 30 * 1000,
    refetchOnWindowFocus: true,
    retry: false,
  })
}

/**
 * Whether the directory pages are served from Postgres.
 *
 * Effectively constant for the life of the tab — it reflects the shape of the
 * schema, not its contents — so it is cached indefinitely and never refetched.
 */
export function useDatabaseDrivenDirectory() {
  return useQuery({
    queryKey: ['directory-source'],
    queryFn: api.directoryIsDatabaseDriven,
    staleTime: Infinity,
    gcTime: Infinity,
  })
}

/**
 * Resolves a rendered record to its `public.listings.id`.
 *
 * Cards on the emergency page are `EmergencyContact`s, not `Listing`s — before
 * the cutover they come from the bundled dataset, and after it they are mapped
 * from database rows keyed on slug. Neither carries the numeric primary key, so
 * neither can build a `/listing/:id` URL on its own.
 *
 * This closes that gap from the one place that does know: the listings query.
 * Matching is by the same composite identity the importer dedupes on, so it
 * works identically in both states and there is no second identifier to keep in
 * step. Returns undefined when the record has no row — a bundled-only entity
 * has no detail page, and the caller renders no link rather than a broken one.
 */
export function useListingIdResolver() {
  const listings = useListings()

  return useMemo(() => {
    const byIdentity = new Map<string, number>()
    for (const listing of listings.data ?? []) {
      byIdentity.set(listingKey(listing.section, listing.title), listing.id)
    }
    return (section: string, title: string) => byIdentity.get(listingKey(section, title))
  }, [listings.data])
}

export function useRentals(filters: RentalFilters) {
  return useQuery({
    queryKey: keys.rentals(filters),
    queryFn: () => api.listRentals(filters),
    staleTime: STALE,
    placeholderData: (prev) => prev,
  })
}
