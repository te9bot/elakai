import { BUSINESS_BY_SLUG, BUSINESSES } from '@/data/businesses'
import { AREA_MAP } from '@/data/categories'
import { cleanCoverage, FALLBACK_COVERAGE, type CoverageBands } from '@/data/coverage'
import { EMERGENCY_CONTACTS } from '@/data/emergency'
import { HEALTH_RECORDS } from '@/data/healthcare'
import type { HealthRecord } from '@/data/healthcare-types'
import { RENTAL_BY_SLUG, RENTALS } from '@/data/rentals'
import type {
  AreaId,
  Business,
  CategoryId,
  EmergencyContact,
  LatLng,
  Rental,
  ScoredBusiness,
  TenantType,
} from '@/data/types'
import { FAKE_LATENCY_MS, KUSHTIA_CENTER } from './config'
import {
  SELECT,
  toBusiness,
  toDoctor,
  toEmergency,
  toFacility,
  toRental,
  type BusinessRow,
  type CategoryBarRow,
  type DoctorRow,
  type EmergencyRow,
  type FacilityRow,
  type RentalRow,
} from './db'
import { haversineKm } from './format'
import { setHealthCorpus } from './healthcare-search'
import { rankBusinesses, setBusinessCorpus, type SearchOptions } from './search'
import { HAS_BACKEND, supabase } from './supabase'

/* ==========================================================================
 * THE BACKEND SEAM
 *
 * Every read in the app goes through this module. Nothing above it imports
 * `src/data/` directly, so the switch from bundled demo data to Postgres
 * happens here and nowhere else.
 *
 * Both paths stay live on purpose. `HAS_BACKEND` is false whenever the Supabase
 * environment variables are absent — a fresh clone, a preview build without
 * secrets, a contributor with no project — and in that state the app serves the
 * bundled dataset instead of throwing on first paint. It is a fallback, not a
 * second source of truth: once a backend is configured the static data is only
 * reachable through the seed script.
 * ========================================================================== */

/** Simulates network latency so loading states exercise real code paths. */
function delay<T>(value: T, ms = FAKE_LATENCY_MS): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms))
}

function areaCoords(area: AreaId): LatLng {
  return AREA_MAP[area]?.coords ?? KUSHTIA_CENTER
}

/**
 * Surfaces a Postgres error as a thrown Error so TanStack Query moves the
 * section into its error state, rather than rendering an empty list that looks
 * like "there is nothing here".
 */
function unwrap<T>(result: { data: T | null; error: { message: string } | null }, what: string): T {
  if (result.error) throw new Error(`Failed to load ${what}: ${result.error.message}`)
  if (result.data === null) throw new Error(`Failed to load ${what}: no data`)
  return result.data
}

/* ------------------------------------------------------------------ */
/* Business corpus                                                     */
/* ------------------------------------------------------------------ */

/**
 * The ranked search in `lib/search.ts` is a tiered fuzzy matcher over the whole
 * corpus — it has to see every listing to score one. So the published set is
 * fetched once, handed to the index, and reused for every subsequent query.
 *
 * Cached as the promise rather than the result, so ten components mounting at
 * once share a single request instead of racing to issue ten.
 */
let corpusPromise: Promise<Business[]> | null = null

async function loadCorpus(): Promise<Business[]> {
  if (!HAS_BACKEND || !supabase) return BUSINESSES

  corpusPromise ??= (async () => {
    const rows = unwrap(
      await supabase
        .from('businesses')
        .select(SELECT.business)
        .eq('status', 'published')
        .order('updated_at', { ascending: false }),
      'listings',
    ) as unknown as BusinessRow[]

    const businesses = rows.map((r) => toBusiness(r, areaCoords))
    setBusinessCorpus(businesses)
    return businesses
  })().catch((error) => {
    // A failed load must not poison the cache — the next attempt should retry
    // rather than replay the rejection forever.
    corpusPromise = null
    throw error
  })

  return corpusPromise
}

/** Called after an admin write so the public queries stop serving stale rows. */
export function invalidateCorpus(): void {
  corpusPromise = null
}

/* ------------------------------------------------------------------ */
/* Businesses                                                          */
/* ------------------------------------------------------------------ */

export async function searchBusinesses(options: SearchOptions): Promise<ScoredBusiness[]> {
  await loadCorpus()
  return HAS_BACKEND ? rankBusinesses(options) : delay(rankBusinesses(options))
}

export async function getBusinessBySlug(slug: string): Promise<Business | null> {
  if (!HAS_BACKEND || !supabase) return delay(BUSINESS_BY_SLUG[slug] ?? null)

  const { data, error } = await supabase
    .from('businesses')
    .select(SELECT.businessDetail)
    .eq('slug', slug)
    .eq('status', 'published')
    .maybeSingle()

  if (error) throw new Error(`Failed to load listing: ${error.message}`)
  if (!data) return null
  return toBusiness(data as unknown as BusinessRow, areaCoords)
}

export async function listByCategory(
  category: CategoryId,
  origin?: LatLng,
  limit?: number,
): Promise<ScoredBusiness[]> {
  await loadCorpus()
  return rankBusinesses({ category, origin, limit })
}

export async function listByCategories(
  categories: CategoryId[],
  origin?: LatLng,
  limit?: number,
): Promise<ScoredBusiness[]> {
  await loadCorpus()
  return rankBusinesses({ categories, origin, limit })
}

/** Highest-rated verified listings, used for the "Popular" rail. */
export async function listPopular(origin?: LatLng, limit = 8): Promise<ScoredBusiness[]> {
  await loadCorpus()
  return rankBusinesses({ origin, sort: 'rating' })
    .filter((r) => r.business.featured)
    .slice(0, limit)
}

/** Most recently verified listings, used for the "Latest verified" rail. */
export async function listLatestVerified(origin?: LatLng, limit = 8): Promise<ScoredBusiness[]> {
  await loadCorpus()
  return [...rankBusinesses({ origin, verifiedOnly: true })]
    .sort((a, z) => z.business.updatedAt.localeCompare(a.business.updatedAt))
    .slice(0, limit)
}

/** Nearby listings in the same category, shown at the foot of a detail page. */
export async function listRelated(business: Business, limit = 4): Promise<ScoredBusiness[]> {
  await loadCorpus()
  return rankBusinesses({
    category: business.category,
    origin: business.coords,
    sort: 'nearest',
  })
    .filter((r) => r.business.id !== business.id)
    .slice(0, limit)
}

export type DirectoryStats = { total: number; verified: number; always: number }

/**
 * Counted in Postgres with `head: true`, so three cheap COUNT queries replace
 * shipping the table to the client to call `.length` on it.
 */
export async function fetchStats(): Promise<DirectoryStats> {
  if (!HAS_BACKEND || !supabase) return delay(countBusinessesSync())

  // Bound to a local: the narrowing above does not survive into the closure.
  const db = supabase
  const published = () =>
    db.from('businesses').select('id', { count: 'exact', head: true }).eq('status', 'published')

  const [total, verified, always] = await Promise.all([
    published(),
    published().eq('verified', true),
    published().eq('always_open', true),
  ])

  const first = total.error ?? verified.error ?? always.error
  if (first) throw new Error(`Failed to count listings: ${first.message}`)

  return {
    total: total.count ?? 0,
    verified: verified.count ?? 0,
    always: always.count ?? 0,
  }
}

/**
 * Synchronous counts over the bundled data.
 *
 * Used as the hero's initial value so the stat line renders a real number on
 * first paint instead of animating up from zero, then reconciles to the live
 * counts when `fetchStats` resolves.
 */
export function countBusinessesSync(): DirectoryStats {
  return {
    total: BUSINESSES.length,
    verified: BUSINESSES.filter((b) => b.verified).length,
    always: BUSINESSES.filter((b) => b.hours === 'always').length,
  }
}

/* ------------------------------------------------------------------ */
/* Emergency                                                           */
/* ------------------------------------------------------------------ */

export async function listEmergency(): Promise<EmergencyContact[]> {
  if (!HAS_BACKEND || !supabase) return delay(EMERGENCY_CONTACTS)

  const rows = unwrap(
    await supabase
      .from('emergency_contacts')
      .select(SELECT.emergency)
      .eq('status', 'published')
      .order('priority', { ascending: true }),
    'emergency contacts',
  ) as unknown as EmergencyRow[]

  return rows.map(toEmergency)
}

/* ------------------------------------------------------------------ */
/* Homepage coverage bands                                             */
/* ------------------------------------------------------------------ */

/**
 * What the two homepage strips say the directory covers.
 *
 * One query for both bands — they are one table, split on `band` — because two
 * queries would let the page render with a new "Covering" and a stale
 * "Everything ELAKAI covers", and the pair is meant to read as one statement.
 *
 * Rows are filtered to published and ordered by `sort_order`, which is exactly
 * what an editor drags around in the admin list. Nothing downstream knows or
 * cares how many come back: the bands measure the rendered result and derive
 * the loop from it, so publishing a chip, archiving one or reordering the set
 * changes the strip on the next fetch with no deploy and no animation change.
 * See `components/infinite-track.tsx`.
 *
 * A category the local catalogue does not know about is dropped rather than
 * rendered as a blank chip — `CATEGORY_MAP` is what supplies the name, emoji
 * and icon, so a row pointing at an id this build has never heard of has
 * nothing to draw.
 */
export async function loadCoverage(): Promise<CoverageBands> {
  if (!HAS_BACKEND || !supabase) return delay(FALLBACK_COVERAGE)

  const rows = unwrap(
    await supabase
      .from('category_bar_items')
      .select(SELECT.categoryBar)
      .eq('status', 'published')
      .order('band', { ascending: true })
      .order('sort_order', { ascending: true }),
    'coverage bands',
  ) as unknown as CategoryBarRow[]

  const bands: CoverageBands = { covering: [], covers: [] }
  for (const row of rows) {
    if (row.band === 'covering' || row.band === 'covers') bands[row.band].push(row.category_id)
  }

  // An empty table is a misconfigured project, not an editorial decision to
  // have no homepage strips — fall back rather than paint two empty sections.
  return {
    covering: cleanCoverage(bands.covering.length ? bands.covering : FALLBACK_COVERAGE.covering),
    covers: cleanCoverage(bands.covers.length ? bands.covers : FALLBACK_COVERAGE.covers),
  }
}

/* ------------------------------------------------------------------ */
/* Rentals                                                             */
/* ------------------------------------------------------------------ */

export type RentalFilters = {
  categories?: CategoryId[]
  maxRent?: number
  minRent?: number
  bedrooms?: number | null
  bathrooms?: number | null
  tenantType?: TenantType | null
  furnishedOnly?: boolean
  area?: string | null
  origin?: LatLng
  sort?: 'recommended' | 'price-asc' | 'price-desc' | 'newest'
}

export type ScoredRental = { rental: Rental; distanceKm: number }

/**
 * Unlike the business search, every rental filter is a plain predicate over
 * indexed columns, so these run in Postgres. Nothing is fetched that the user
 * has filtered out — which is what keeps the page usable once there are more
 * listings than fit in a phone's memory.
 */
export async function listRentals(filters: RentalFilters = {}): Promise<ScoredRental[]> {
  const {
    categories,
    maxRent,
    minRent,
    bedrooms,
    bathrooms,
    tenantType,
    furnishedOnly,
    area,
    origin,
    sort = 'recommended',
  } = filters

  if (!HAS_BACKEND || !supabase) return delay(filterRentalsLocally(filters))

  let q = supabase.from('rentals').select(SELECT.rental).eq('status', 'published')

  if (categories?.length) q = q.in('category', categories)
  if (minRent !== undefined) q = q.gte('rent', minRent)
  if (maxRent !== undefined) q = q.lte('rent', maxRent)
  if (bedrooms != null && bedrooms > 0) q = q.gte('bedrooms', bedrooms)
  if (bathrooms != null && bathrooms > 0) q = q.gte('bathrooms', bathrooms)
  // A "family" filter still surfaces listings open to anyone.
  if (tenantType) q = q.in('tenant_type', [tenantType, 'any'])
  if (furnishedOnly) q = q.eq('furnished', true)
  if (area) q = q.eq('area_id', area)

  switch (sort) {
    case 'price-asc':
      q = q.order('rent', { ascending: true })
      break
    case 'price-desc':
      q = q.order('rent', { ascending: false })
      break
    case 'newest':
      q = q.order('updated_at', { ascending: false })
      break
    default:
      q = q.order('verified', { ascending: false }).order('updated_at', { ascending: false })
  }

  const rows = unwrap(await q, 'rentals') as unknown as RentalRow[]
  return rows.map((r) => {
    const rental = toRental(r, areaCoords)
    return { rental, distanceKm: origin ? haversineKm(origin, rental.coords) : 0 }
  })
}

/** The same filters applied in memory, for the no-backend fallback. */
function filterRentalsLocally(filters: RentalFilters): ScoredRental[] {
  const {
    categories, maxRent, minRent, bedrooms, bathrooms,
    tenantType, furnishedOnly, area, origin, sort = 'recommended',
  } = filters

  const allowed = categories?.length ? new Set(categories) : null

  const out = RENTALS.filter((r) => {
    if (allowed && !allowed.has(r.category)) return false
    if (maxRent !== undefined && r.rent > maxRent) return false
    if (minRent !== undefined && r.rent < minRent) return false
    if (bedrooms != null && bedrooms > 0 && r.bedrooms < bedrooms) return false
    if (bathrooms != null && bathrooms > 0 && r.bathrooms < bathrooms) return false
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

  return out
}

/* ------------------------------------------------------------------ */
/* Healthcare                                                          */
/* ------------------------------------------------------------------ */

/**
 * The healthcare directory is loaded whole, for the same reason the business
 * corpus is: `lib/healthcare-search.ts` cross-links doctors to the facilities
 * they sit in and scores a query against both, which it cannot do one page at
 * a time. Facilities and doctors are fetched in parallel and handed to that
 * module as one corpus.
 */
let healthPromise: Promise<HealthRecord[]> | null = null

export async function loadHealthcare(): Promise<HealthRecord[]> {
  if (!HAS_BACKEND || !supabase) return delay(HEALTH_RECORDS)

  healthPromise ??= (async () => {
    const [facilities, doctors] = await Promise.all([
      supabase.from('facilities').select(SELECT.facility).eq('status', 'published'),
      supabase.from('doctors').select(SELECT.doctor).eq('status', 'published'),
    ])

    const rows = {
      facilities: unwrap(facilities, 'healthcare facilities') as unknown as FacilityRow[],
      doctors: unwrap(doctors, 'doctors') as unknown as DoctorRow[],
    }

    const records: HealthRecord[] = [
      ...rows.facilities.map(toFacility),
      ...rows.doctors.map(toDoctor),
    ]

    // A facility's doctor list is the mirror of `doctor_facilities`, which only
    // the doctor side carries — reconstruct it so `doctorsAt()` resolves both
    // directions exactly as it does against the bundled data.
    const byFacility = new Map<string, string[]>()
    for (const d of rows.doctors) {
      for (const link of d.doctor_facilities ?? []) {
        const list = byFacility.get(link.facility_id) ?? []
        list.push(d.id)
        byFacility.set(link.facility_id, list)
      }
    }
    for (const r of records) {
      if (r.kind === 'facility') r.doctorIds = byFacility.get(r.id) ?? undefined
    }

    setHealthCorpus(records)
    return records
  })().catch((error) => {
    healthPromise = null
    throw error
  })

  return healthPromise
}

export function invalidateHealthcare(): void {
  healthPromise = null
}

export async function getRentalBySlug(slug: string): Promise<Rental | null> {
  if (!HAS_BACKEND || !supabase) return delay(RENTAL_BY_SLUG[slug] ?? null)

  const { data, error } = await supabase
    .from('rentals')
    .select(SELECT.rental)
    .eq('slug', slug)
    .eq('status', 'published')
    .maybeSingle()

  if (error) throw new Error(`Failed to load rental: ${error.message}`)
  if (!data) return null
  return toRental(data as unknown as RentalRow, areaCoords)
}
