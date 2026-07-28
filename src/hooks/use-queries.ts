import { useQuery } from '@tanstack/react-query'
import * as api from '@/lib/api'
import type { RentalFilters } from '@/lib/api'
import type { SearchOptions } from '@/lib/search'
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

export function useRentals(filters: RentalFilters) {
  return useQuery({
    queryKey: keys.rentals(filters),
    queryFn: () => api.listRentals(filters),
    staleTime: STALE,
    placeholderData: (prev) => prev,
  })
}
