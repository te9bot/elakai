import { BUSINESS_BY_SLUG, BUSINESSES } from '@/data/businesses'
import { EMERGENCY_CONTACTS } from '@/data/emergency'
import { RENTAL_BY_SLUG, RENTALS } from '@/data/rentals'
import type {
  Business,
  CategoryId,
  EmergencyContact,
  LatLng,
  Rental,
  ScoredBusiness,
  TenantType,
} from '@/data/types'
import { FAKE_LATENCY_MS } from './config'
import { haversineKm } from './format'
import { rankBusinesses, type SearchOptions } from './search'

/* ==========================================================================
 * THE BACKEND SEAM
 *
 * Every read in the app goes through this module. Nothing above it imports
 * `src/data/` directly. To move to a real backend, replace the bodies below
 * with `fetch` calls that return the same shapes — no component, hook, or page
 * needs to change.
 * ========================================================================== */

/** Simulates network latency so loading skeletons exercise real code paths. */
function delay<T>(value: T, ms = FAKE_LATENCY_MS): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms))
}

/* ------------------------------------------------------------------ */
/* Businesses                                                          */
/* ------------------------------------------------------------------ */

export function searchBusinesses(options: SearchOptions): Promise<ScoredBusiness[]> {
  return delay(rankBusinesses(options))
}

export function getBusinessBySlug(slug: string): Promise<Business | null> {
  return delay(BUSINESS_BY_SLUG[slug] ?? null)
}

export function listByCategory(
  category: CategoryId,
  origin?: LatLng,
  limit?: number,
): Promise<ScoredBusiness[]> {
  return delay(rankBusinesses({ category, origin, limit }))
}

export function listByCategories(
  categories: CategoryId[],
  origin?: LatLng,
  limit?: number,
): Promise<ScoredBusiness[]> {
  return delay(rankBusinesses({ categories, origin, limit }))
}

/** Highest-rated verified listings, used for the "Popular" rail. */
export function listPopular(origin?: LatLng, limit = 8): Promise<ScoredBusiness[]> {
  return delay(
    rankBusinesses({ origin, sort: 'rating' })
      .filter((r) => r.business.featured)
      .slice(0, limit),
  )
}

/** Most recently verified listings, used for the "Latest verified" rail. */
export function listLatestVerified(origin?: LatLng, limit = 8): Promise<ScoredBusiness[]> {
  const verified = rankBusinesses({ origin, verifiedOnly: true })
  return delay(
    [...verified]
      .sort((a, z) => z.business.updatedAt.localeCompare(a.business.updatedAt))
      .slice(0, limit),
  )
}

/** Nearby listings in the same category, shown at the foot of a detail page. */
export function listRelated(business: Business, limit = 4): Promise<ScoredBusiness[]> {
  const same = rankBusinesses({
    category: business.category,
    origin: business.coords,
    sort: 'nearest',
  }).filter((r) => r.business.id !== business.id)
  return delay(same.slice(0, limit))
}

export function countBusinesses(): { total: number; verified: number; always: number } {
  return {
    total: BUSINESSES.length,
    verified: BUSINESSES.filter((b) => b.verified).length,
    always: BUSINESSES.filter((b) => b.hours === 'always').length,
  }
}

/* ------------------------------------------------------------------ */
/* Emergency                                                           */
/* ------------------------------------------------------------------ */

export function listEmergency(): Promise<EmergencyContact[]> {
  return delay(EMERGENCY_CONTACTS)
}

/* ------------------------------------------------------------------ */
/* Rentals                                                             */
/* ------------------------------------------------------------------ */

export type RentalFilters = {
  categories?: CategoryId[]
  maxRent?: number
  minRent?: number
  bedrooms?: number | null
  tenantType?: TenantType | null
  furnishedOnly?: boolean
  area?: string | null
  origin?: LatLng
  sort?: 'recommended' | 'price-asc' | 'price-desc' | 'newest'
}

export type ScoredRental = { rental: Rental; distanceKm: number }

export function listRentals(filters: RentalFilters = {}): Promise<ScoredRental[]> {
  const {
    categories,
    maxRent,
    minRent,
    bedrooms,
    tenantType,
    furnishedOnly,
    area,
    origin,
    sort = 'recommended',
  } = filters

  const allowed = categories?.length ? new Set(categories) : null

  let out = RENTALS.filter((r) => {
    if (allowed && !allowed.has(r.category)) return false
    if (maxRent !== undefined && r.rent > maxRent) return false
    if (minRent !== undefined && r.rent < minRent) return false
    if (bedrooms != null && bedrooms > 0 && r.bedrooms < bedrooms) return false
    // A "family" filter should still surface listings open to anyone.
    if (tenantType && r.tenantType !== tenantType && r.tenantType !== 'any') return false
    if (furnishedOnly && !r.furnished) return false
    if (area && r.area !== area) return false
    return true
  }).map((rental) => ({
    rental,
    distanceKm: origin ? haversineKm(origin, rental.coords) : 0,
  }))

  switch (sort) {
    case 'price-asc':
      out.sort((a, z) => a.rental.rent - z.rental.rent)
      break
    case 'price-desc':
      out.sort((a, z) => z.rental.rent - a.rental.rent)
      break
    case 'newest':
      out.sort((a, z) => z.rental.updatedAt.localeCompare(a.rental.updatedAt))
      break
    default:
      out.sort(
        (a, z) =>
          Number(z.rental.verified) - Number(a.rental.verified) ||
          z.rental.updatedAt.localeCompare(a.rental.updatedAt),
      )
  }

  return delay(out)
}

export function getRentalBySlug(slug: string): Promise<Rental | null> {
  return delay(RENTAL_BY_SLUG[slug] ?? null)
}
